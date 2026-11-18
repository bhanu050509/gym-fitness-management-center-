/**
 * ============================================================================
 * PULSE FITNESS MANAGEMENT SYSTEM - APPLICATION LOGIC
 * Pure Vanilla JavaScript & LocalStorage Implementation
 * ============================================================================
 */

(function () {
  'use strict';

  // LocalStorage Keys
  const KEYS = {
    USERS: 'pulse_fitness_users_v2',
    SESSION: 'pulse_fitness_session_v2',
    MEMBERS: 'pulse_fitness_members_v2',
    WORKOUTS: 'pulse_fitness_workouts_v2',
    SCHEDULES: 'pulse_fitness_schedules_v2',
    PROGRESS: 'pulse_fitness_progress_v2'
  };

  // State
  let currentUser = null;
  let activeTab = 'dashboard';
  let modalAction = null;
  let modalRecordId = null;

  // Database helper
  const db = {
    get: (key, fallback = []) => {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
      } catch (e) {
        console.error('Storage read error', e);
        return fallback;
      }
    },
    set: (key, data) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error('Storage write error', e);
      }
    }
  };

  // Initialize seed data on first load
  function initSeedData() {
    if (!localStorage.getItem(KEYS.USERS)) {
      const defaultUsers = [
        {
          id: 1,
          name: 'Chief Admin Dave',
          email: 'admin@pulse.com',
          password: 'admin123',
          role: 'admin',
          phone: '+1 (555) 012-3456',
          goal: 'General Health, Wellness & Longevity',
          bio: 'Head fitness director, CSCS coach, and facility administrator.'
        },
        {
          id: 2,
          name: 'Sarah Connor',
          email: 'sarah@pulse.com',
          password: 'member123',
          role: 'member',
          phone: '+1 (555) 098-7654',
          goal: 'Body Recomposition & Fat Loss',
          bio: 'Fitness enthusiast training for tactical endurance and functional strength.'
        }
      ];
      db.set(KEYS.USERS, defaultUsers);
    }

    if (!localStorage.getItem(KEYS.MEMBERS)) {
      const defaultMembers = [
        { id: 101, name: 'Sarah Connor', email: 'sarah@pulse.com', phone: '+1 555-098-7654', plan: 'Annual VIP', status: 'Active', joinedDate: '2026-01-10' },
        { id: 102, name: 'Marcus Wright', email: 'marcus@example.com', phone: '+1 555-023-4567', plan: 'Quarterly', status: 'Active', joinedDate: '2026-02-15' },
        { id: 103, name: 'Elena Rostova', email: 'elena@example.com', phone: '+1 555-034-5678', plan: 'Monthly', status: 'Inactive', joinedDate: '2025-11-04' },
        { id: 104, name: 'David Miller', email: 'david@example.com', phone: '+1 555-045-6789', plan: 'Monthly', status: 'Expired', joinedDate: '2025-08-20' }
      ];
      db.set(KEYS.MEMBERS, defaultMembers);
    }

    if (!localStorage.getItem(KEYS.WORKOUTS)) {
      const defaultWorkouts = [
        {
          id: 201,
          name: 'Power Hypertrophy Upper Split',
          category: 'Strength',
          duration: 60,
          description: 'Heavy barbell bench press, incline dumbbell rows, overhead military press, and arm supersets.'
        },
        {
          id: 202,
          name: 'Metabolic Conditioning Circuit',
          category: 'HIIT',
          duration: 45,
          description: 'High-intensity intervals: rowing sprints, kettlebell snatches, wall balls, and plyo box jumps.'
        },
        {
          id: 203,
          name: 'Athletic Lower Body & Posterior Chain',
          category: 'Strength',
          duration: 55,
          description: 'Barbell back squats, Romanian deadlifts, Bulgarian split squats, and calf raises.'
        },
        {
          id: 204,
          name: 'Decompression & Joint Mobility',
          category: 'Mobility',
          duration: 35,
          description: 'Deep hip openers, thoracic spine rotations, dynamic hamstrings stretch, and core hollow holds.'
        }
      ];
      db.set(KEYS.WORKOUTS, defaultWorkouts);
    }

    if (!localStorage.getItem(KEYS.SCHEDULES)) {
      const defaultSchedules = [
        { id: 301, memberName: 'Sarah Connor', workoutName: 'Power Hypertrophy Upper Split', date: '2026-11-20', time: '07:30', status: 'Scheduled' },
        { id: 302, memberName: 'Marcus Wright', workoutName: 'Metabolic Conditioning Circuit', date: '2026-11-19', time: '17:45', status: 'Completed' },
        { id: 303, memberName: 'Elena Rostova', workoutName: 'Decompression & Joint Mobility', date: '2026-11-21', time: '09:00', status: 'Cancelled' }
      ];
      db.set(KEYS.SCHEDULES, defaultSchedules);
    }

    if (!localStorage.getItem(KEYS.PROGRESS)) {
      const defaultProgress = [
        { id: 401, memberName: 'Sarah Connor', date: '2026-11-01', weight: 64.2, bodyFat: 19.5, notes: 'Completed full pull-up sets unassisted. Feeling strong.' },
        { id: 402, memberName: 'Sarah Connor', date: '2026-11-10', weight: 63.8, bodyFat: 19.1, notes: 'Hit personal record on deadlift (105kg x 3 reps).' },
        { id: 403, memberName: 'Marcus Wright', date: '2026-11-12', weight: 84.0, bodyFat: 15.0, notes: 'Sprinted 2km row in under 7 minutes.' }
      ];
      db.set(KEYS.PROGRESS, defaultProgress);
    }
  }

  // Toast notifications
  function showToast(message) {
    const toast = document.getElementById('toastBox');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Safe HTML Escaping
  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  // Check if active user is Admin / Staff
  function isAdmin() {
    return currentUser && currentUser.role === 'admin';
  }

  // =========================================================================
  // AUTHENTICATION LOGIC (LOGIN, REGISTER, DEMO SWITCHER)
  // =========================================================================
  function initAuth() {
    const tabSignIn = document.getElementById('tabSignIn');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');
    const linkToRegister = document.getElementById('linkToRegister');
    const linkToLogin = document.getElementById('linkToLogin');

    function showAlert(msg, isSuccess = false) {
      if (!msg) {
        authAlert.className = 'alert-banner';
        authAlert.innerHTML = '';
        return;
      }
      authAlert.className = `alert-banner ${isSuccess ? 'alert-success' : 'alert-error'} show`;
      authAlert.innerHTML = `<span>${isSuccess ? '✓' : '⚠️'}</span> <span>${escapeHTML(msg)}</span>`;
    }

    function showForm(view) {
      showAlert('');
      if (view === 'register') {
        tabRegister.classList.add('active');
        tabSignIn.classList.remove('active');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
      } else {
        tabSignIn.classList.add('active');
        tabRegister.classList.remove('active');
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    }

    tabSignIn.addEventListener('click', () => showForm('login'));
    tabRegister.addEventListener('click', () => showForm('register'));
    linkToRegister.addEventListener('click', (e) => { e.preventDefault(); showForm('register'); });
    linkToLogin.addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });

    // Handle Login
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showAlert('');

      const email = document.getElementById('loginEmail').value.trim().toLowerCase();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        return showAlert('Please provide both your email address and password.');
      }

      const users = db.get(KEYS.USERS);
      const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

      if (!user) {
        return showAlert('Incorrect email or password. Please verify your credentials.');
      }

      loginUser(user);
    });

    // Handle Registration
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showAlert('');

      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim().toLowerCase();
      const role = document.getElementById('regRole').value;
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;

      // Validation
      if (name.length < 2) return showAlert('Full name must be at least 2 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAlert('Please enter a valid email address.');
      if (password.length < 6) return showAlert('Password must be at least 6 characters long.');
      if (password !== confirmPassword) return showAlert('Passwords do not match. Please re-enter.');

      const users = db.get(KEYS.USERS);
      if (users.some(u => u.email.toLowerCase() === email)) {
        return showAlert('An account is already registered with this email address.');
      }

      const newUser = {
        id: Date.now(),
        name,
        email,
        role,
        phone,
        password,
        goal: 'General Health, Wellness & Longevity',
        bio: 'New registered fitness center member.'
      };

      users.push(newUser);
      db.set(KEYS.USERS, users);

      // If registered as member, automatically add to active members directory
      if (role === 'member') {
        const members = db.get(KEYS.MEMBERS);
        members.push({
          id: Date.now(),
          name,
          email,
          phone: phone || '+1 (555) 000-0000',
          plan: 'Monthly',
          status: 'Active',
          joinedDate: new Date().toISOString().split('T')[0]
        });
        db.set(KEYS.MEMBERS, members);
      }

      registerForm.reset();
      showToast(`Account created! Welcome, ${newUser.name}.`);
      loginUser(newUser);
    });

    // 1-Click Quick Demo Buttons
    document.getElementById('quickDemoAdmin').addEventListener('click', () => {
      const users = db.get(KEYS.USERS);
      const admin = users.find(u => u.role === 'admin') || {
        id: 1, name: 'Chief Admin Dave', email: 'admin@pulse.com', role: 'admin'
      };
      loginUser(admin);
    });

    document.getElementById('quickDemoMember').addEventListener('click', () => {
      const users = db.get(KEYS.USERS);
      const member = users.find(u => u.role === 'member') || {
        id: 2, name: 'Sarah Connor', email: 'sarah@pulse.com', role: 'member'
      };
      loginUser(member);
    });

    // Logout Button
    document.getElementById('logoutBtn').addEventListener('click', () => {
      logoutUser();
    });
  }

  function loginUser(user) {
    currentUser = user;
    db.set(KEYS.SESSION, user);

    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');

    applyRoleDifferentiations();
    updateUserWidget();
    switchTab('dashboard');
    showToast(`Signed in as ${user.name} (${user.role.toUpperCase()})`);
  }

  function logoutUser() {
    currentUser = null;
    localStorage.removeItem(KEYS.SESSION);

    document.getElementById('appSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    showToast('Signed out successfully.');
  }

  // Update user badge and sidebar avatar
  function updateUserWidget() {
    if (!currentUser) return;
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    const avatarEl = document.getElementById('userAvatar');
    const topRoleBadge = document.getElementById('topRoleBadge');

    const admin = isAdmin();
    const roleLabel = admin ? 'ADMIN' : 'MEMBER';
    const badgeClass = admin ? 'badge-admin' : 'badge-member';

    nameEl.textContent = currentUser.name;
    roleEl.textContent = roleLabel;
    roleEl.className = `badge ${badgeClass}`;

    avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

    topRoleBadge.textContent = admin ? 'ADMINISTRATOR' : 'MEMBER';
    topRoleBadge.className = `badge ${badgeClass}`;
  }

  // =========================================================================
  // DIFFERENTIATE COMMANDS USED BY ADMIN VS MEMBERS
  // =========================================================================
  function applyRoleDifferentiations() {
    const admin = isAdmin();
    const adminElements = document.querySelectorAll('.admin-only');

    // Toggle admin-only command buttons visibility
    adminElements.forEach(el => {
      if (admin) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Populate Sidebar Command Differentiator Box
    const roleHeader = document.getElementById('roleBoxHeader');
    const roleList = document.getElementById('roleBoxList');

    if (admin) {
      roleHeader.textContent = 'Admin / Staff Commands';
      roleHeader.style.color = 'var(--primary)';
      roleList.innerHTML = `
        <li>Add, Edit &amp; Delete Members</li>
        <li>Create &amp; Manage Workouts</li>
        <li>Override Schedule Statuses</li>
        <li>Monitor Global Facility Metrics</li>
      `;
    } else {
      roleHeader.textContent = 'Member Commands';
      roleHeader.style.color = 'var(--cyan)';
      roleList.innerHTML = `
        <li>Browse Workout Programs</li>
        <li>Book Training Sessions</li>
        <li>Track Weight &amp; Body Fat</li>
        <li>Update Personal Profile</li>
      `;
    }
  }

  // =========================================================================
  // NAVIGATION & TAB SWITCHING
  // =========================================================================
  function initNavigation() {
    const navButtons = document.querySelectorAll('.sidebar-menu button[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
      });
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;

    // Toggle active state on buttons
    document.querySelectorAll('.sidebar-menu button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Show selected pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.add('hidden');
    });

    const activePane = document.getElementById(`view-${tabId}`);
    if (activePane) activePane.classList.remove('hidden');

    // Update Topbar Titles
    const titles = {
      dashboard: { title: 'Dashboard Overview', subtitle: 'Real-time facility capacity, active members, and fitness activity' },
      members: { title: 'Member Records Directory', subtitle: 'Manage member roster, active subscription plans, and status' },
      workouts: { title: 'Workout Plans & Library', subtitle: 'Curated exercise routines, muscle splits, and endurance circuits' },
      schedules: { title: 'Training Calendar & Schedules', subtitle: 'Manage training appointments, bookings, and session completions' },
      progress: { title: 'Fitness Progress & Milestones', subtitle: 'Track historical weight logs, body fat percentages, and personal bests' },
      profile: { title: 'My Profile & Preferences', subtitle: 'Update personal contact information, fitness goals, and training notes' }
    };

    const info = titles[tabId] || { title: 'Pulse Fitness', subtitle: '' };
    document.getElementById('topbarHeading').textContent = info.title;
    document.getElementById('topbarSubheading').textContent = info.subtitle;

    // Re-render relevant view
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'members') renderMembers();
    if (tabId === 'workouts') renderWorkouts();
    if (tabId === 'schedules') renderSchedules();
    if (tabId === 'progress') renderProgress();
    if (tabId === 'profile') renderProfile();
  }

  // =========================================================================
  // 1. DASHBOARD VIEW
  // =========================================================================
  function renderDashboard() {
    const members = db.get(KEYS.MEMBERS);
    const workouts = db.get(KEYS.WORKOUTS);
    const schedules = db.get(KEYS.SCHEDULES);

    document.getElementById('statTotalMembers').textContent = members.length;
    document.getElementById('statActiveMembers').textContent = members.filter(m => m.status === 'Active').length;
    document.getElementById('statTotalWorkouts').textContent = workouts.length;
    document.getElementById('statTotalSchedules').textContent = schedules.length;

    // Recent Members Table (Dashboard)
    const recentMembersEl = document.getElementById('recentMembersTbody');
    const recent = [...members].reverse().slice(0, 5);

    if (recent.length === 0) {
      recentMembersEl.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No member records yet.</td></tr>`;
    } else {
      recentMembersEl.innerHTML = recent.map(m => `
        <tr>
          <td><strong>${escapeHTML(m.name)}</strong></td>
          <td>${escapeHTML(m.email)}</td>
          <td>${escapeHTML(m.plan)}</td>
          <td><span class="badge badge-${m.status.toLowerCase()}">${escapeHTML(m.status)}</span></td>
        </tr>
      `).join('');
    }

    // Upcoming Sessions Table (Dashboard)
    const upcomingSchedulesEl = document.getElementById('upcomingSchedulesTbody');
    const upcoming = [...schedules].reverse().slice(0, 5);

    if (upcoming.length === 0) {
      upcomingSchedulesEl.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No upcoming sessions scheduled.</td></tr>`;
    } else {
      upcomingSchedulesEl.innerHTML = upcoming.map(s => `
        <tr>
          <td>${escapeHTML(s.memberName)}</td>
          <td>${escapeHTML(s.workoutName)}</td>
          <td>${escapeHTML(s.date)} @ ${escapeHTML(s.time)}</td>
          <td><span class="badge badge-${s.status.toLowerCase()}">${escapeHTML(s.status)}</span></td>
        </tr>
      `).join('');
    }
  }

  // =========================================================================
  // 2. MEMBER RECORDS VIEW
  // =========================================================================
  function initMembers() {
    document.getElementById('memberSearchInput').addEventListener('input', renderMembers);
    document.getElementById('memberStatusFilter').addEventListener('change', renderMembers);

    document.getElementById('addMemberBtn').addEventListener('click', () => {
      openModal('add-member');
    });
  }

  function renderMembers() {
    const members = db.get(KEYS.MEMBERS);
    const search = (document.getElementById('memberSearchInput').value || '').toLowerCase();
    const filter = document.getElementById('memberStatusFilter').value || '';
    const admin = isAdmin();

    const filtered = members.filter(m => {
      const matchSearch = [m.name, m.email, m.phone, m.plan].some(val =>
        String(val || '').toLowerCase().includes(search)
      );
      const matchFilter = !filter || m.status === filter;
      return matchSearch && matchFilter;
    });

    const tbody = document.getElementById('membersTableBody');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No matching members found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(m => `
      <tr>
        <td><strong>${escapeHTML(m.name)}</strong></td>
        <td>${escapeHTML(m.email)}</td>
        <td>${escapeHTML(m.phone || '—')}</td>
        <td>${escapeHTML(m.plan)}</td>
        <td>${escapeHTML(m.joinedDate || '2026-01-01')}</td>
        <td>
          ${admin ? `
            <select onchange="window.app.updateMemberStatus(${m.id}, this.value)" class="form-control" style="width:auto;padding:4px 8px;font-size:12px;">
              <option value="Active" ${m.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${m.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
              <option value="Expired" ${m.status === 'Expired' ? 'selected' : ''}>Expired</option>
            </select>
          ` : `
            <span class="badge badge-${m.status.toLowerCase()}">${escapeHTML(m.status)}</span>
          `}
        </td>
        <td>
          ${admin ? `
            <div class="actions-row">
              <button class="btn btn-secondary btn-sm" onclick="window.app.editMember(${m.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="window.app.deleteMember(${m.id})">Delete</button>
            </div>
          ` : `
            <span style="font-size:12px;color:var(--text-dim);">Directory View Only</span>
          `}
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // 3. WORKOUT PLANS VIEW
  // =========================================================================
  function initWorkouts() {
    document.getElementById('addWorkoutBtn').addEventListener('click', () => {
      openModal('add-workout');
    });
  }

  function renderWorkouts() {
    const workouts = db.get(KEYS.WORKOUTS);
    const grid = document.getElementById('workoutsGrid');
    const admin = isAdmin();

    if (workouts.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">No workout routines found.</p>`;
      return;
    }

    grid.innerHTML = workouts.map(w => `
      <div class="workout-card">
        <div>
          <div class="workout-card-header">
            <span class="workout-card-category">${escapeHTML(w.category)}</span>
            <span style="font-size:12px;color:var(--text-muted);">⏱ ${escapeHTML(w.duration)} mins</span>
          </div>
          <h3 class="workout-card-title">${escapeHTML(w.name)}</h3>
          <p class="workout-card-desc">${escapeHTML(w.description)}</p>
        </div>

        <div class="workout-card-footer">
          ${admin ? `
            <span class="badge badge-admin">Admin Controls</span>
            <div class="actions-row">
              <button class="btn btn-secondary btn-sm" onclick="window.app.editWorkout(${w.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="window.app.deleteWorkout(${w.id})">Delete</button>
            </div>
          ` : `
            <span style="font-size:12px;color:var(--cyan);">✓ Available to Book</span>
            <button class="btn btn-cyan btn-sm" onclick="window.app.bookWorkoutForSelf('${escapeHTML(w.name)}')">
              Book Session →
            </button>
          `}
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 4. TRAINING SCHEDULES VIEW
  // =========================================================================
  function initSchedules() {
    document.getElementById('addScheduleBtn').addEventListener('click', () => {
      openModal('add-schedule');
    });
    document.getElementById('scheduleStatusFilter').addEventListener('change', renderSchedules);
  }

  function renderSchedules() {
    const schedules = db.get(KEYS.SCHEDULES);
    const filter = document.getElementById('scheduleStatusFilter').value || '';
    const admin = isAdmin();

    let list = schedules;
    if (!admin) {
      // Member only sees their own booked schedules
      list = list.filter(s => s.memberName.toLowerCase() === currentUser.name.toLowerCase());
    }

    if (filter) {
      list = list.filter(s => s.status === filter);
    }

    const tbody = document.getElementById('schedulesTableBody');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No training sessions found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td><strong>${escapeHTML(s.memberName)}</strong></td>
        <td>${escapeHTML(s.workoutName)}</td>
        <td>${escapeHTML(s.date)}</td>
        <td>${escapeHTML(s.time)}</td>
        <td>
          <select onchange="window.app.updateScheduleStatus(${s.id}, this.value)" class="form-control" style="width:auto;padding:4px 8px;font-size:12px;">
            <option value="Scheduled" ${s.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
            <option value="Completed" ${s.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${s.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="window.app.deleteSchedule(${s.id})">Remove</button>
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // 5. PROGRESS & HISTORY TRACKING VIEW
  // =========================================================================
  function initProgress() {
    document.getElementById('addProgressBtn').addEventListener('click', () => {
      openModal('add-progress');
    });
  }

  function renderProgress() {
    const progressLogs = db.get(KEYS.PROGRESS);
    const admin = isAdmin();

    let list = progressLogs;
    if (!admin) {
      // Member only sees their personal progress records
      list = list.filter(p => p.memberName.toLowerCase() === currentUser.name.toLowerCase());
    }

    const tbody = document.getElementById('progressTableBody');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No progress logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => `
      <tr>
        <td><strong>${escapeHTML(p.memberName)}</strong></td>
        <td>${escapeHTML(p.date)}</td>
        <td><strong>${escapeHTML(p.weight)}</strong> kg</td>
        <td><span class="text-cyan">${escapeHTML(p.bodyFat)}%</span></td>
        <td>${escapeHTML(p.notes || '—')}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="window.app.deleteProgress(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // 6. MY PROFILE MANAGEMENT VIEW
  // =========================================================================
  function initProfile() {
    const form = document.getElementById('profileForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('profName').value.trim();
      const phone = document.getElementById('profPhone').value.trim();
      const goal = document.getElementById('profGoal').value;
      const bio = document.getElementById('profBio').value.trim();

      if (name.length < 2) {
        alert('Name must be at least 2 characters.');
        return;
      }

      currentUser.name = name;
      currentUser.phone = phone;
      currentUser.goal = goal;
      currentUser.bio = bio;

      // Update in user list
      const users = db.get(KEYS.USERS);
      const idx = users.findIndex(u => u.id === currentUser.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], name, phone, goal, bio };
        db.set(KEYS.USERS, users);
      }
      db.set(KEYS.SESSION, currentUser);

      // If member, also update in members list
      const members = db.get(KEYS.MEMBERS);
      const mIdx = members.findIndex(m => m.email.toLowerCase() === currentUser.email.toLowerCase());
      if (mIdx !== -1) {
        members[mIdx].name = name;
        members[mIdx].phone = phone;
        db.set(KEYS.MEMBERS, members);
      }

      updateUserWidget();
      showToast('Profile updated successfully!');
    });
  }

  function renderProfile() {
    if (!currentUser) return;
    document.getElementById('profName').value = currentUser.name || '';
    document.getElementById('profEmail').value = currentUser.email || '';
    document.getElementById('profPhone').value = currentUser.phone || '';
    document.getElementById('profGoal').value = currentUser.goal || 'General Health, Wellness & Longevity';
    document.getElementById('profBio').value = currentUser.bio || '';

    const badge = document.getElementById('profileRoleBadge');
    badge.textContent = currentUser.role.toUpperCase();
    badge.className = `badge ${isAdmin() ? 'badge-admin' : 'badge-member'}`;
  }

  // =========================================================================
  // MODAL FORMS & EVENT LOGIC
  // =========================================================================
  function openModal(action, record = null) {
    modalAction = action;
    modalRecordId = record ? record.id : null;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const fieldsEl = document.getElementById('modalFields');
    const alertEl = document.getElementById('modalAlert');

    alertEl.className = 'alert-banner';
    alertEl.textContent = '';

    const members = db.get(KEYS.MEMBERS);
    const workouts = db.get(KEYS.WORKOUTS);

    let title = 'Manage Record';
    let html = '';

    // Member Modal Form
    if (action === 'add-member' || action === 'edit-member') {
      title = action === 'add-member' ? 'Add New Gym Member' : 'Edit Member Details';
      const val = record || {};
      html = `
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="mName" class="form-control" value="${escapeHTML(val.name || '')}" placeholder="e.g. John Doe" required>
        </div>
        <div class="form-group">
          <label>Email Address *</label>
          <input type="email" id="mEmail" class="form-control" value="${escapeHTML(val.email || '')}" placeholder="john@example.com" required>
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input type="tel" id="mPhone" class="form-control" value="${escapeHTML(val.phone || '')}" placeholder="+1 (555) 000-0000">
        </div>
        <div class="form-group">
          <label>Membership Tier *</label>
          <select id="mPlan" class="form-control">
            <option value="Monthly" ${val.plan === 'Monthly' ? 'selected' : ''}>Monthly ($49 / mo)</option>
            <option value="Quarterly" ${val.plan === 'Quarterly' ? 'selected' : ''}>Quarterly ($129 / qtr)</option>
            <option value="Annual VIP" ${val.plan === 'Annual VIP' ? 'selected' : ''}>Annual VIP ($449 / yr)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Membership Status *</label>
          <select id="mStatus" class="form-control">
            <option value="Active" ${val.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${val.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            <option value="Expired" ${val.status === 'Expired' ? 'selected' : ''}>Expired</option>
          </select>
        </div>
      `;
    }

    // Workout Modal Form
    if (action === 'add-workout' || action === 'edit-workout') {
      title = action === 'add-workout' ? 'Create Workout Plan' : 'Edit Workout Plan';
      const val = record || {};
      html = `
        <div class="form-group">
          <label>Workout Program Name *</label>
          <input type="text" id="wName" class="form-control" value="${escapeHTML(val.name || '')}" placeholder="e.g. Pull Hypertrophy &amp; Core" required>
        </div>
        <div class="form-group">
          <label>Training Category *</label>
          <select id="wCategory" class="form-control">
            <option value="Strength" ${val.category === 'Strength' ? 'selected' : ''}>Strength &amp; Hypertrophy</option>
            <option value="HIIT" ${val.category === 'HIIT' ? 'selected' : ''}>HIIT &amp; Functional Agility</option>
            <option value="Cardio" ${val.category === 'Cardio' ? 'selected' : ''}>Cardiovascular Endurance</option>
            <option value="Mobility" ${val.category === 'Mobility' ? 'selected' : ''}>Joint Mobility &amp; Yoga</option>
          </select>
        </div>
        <div class="form-group">
          <label>Duration (Minutes) *</label>
          <input type="number" id="wDuration" class="form-control" min="15" max="180" value="${val.duration || 45}" required>
        </div>
        <div class="form-group">
          <label>Routine Description / Exercises</label>
          <textarea id="wDesc" class="form-control" rows="3" placeholder="List key exercises, tempo, rest periods...">${escapeHTML(val.description || '')}</textarea>
        </div>
      `;
    }

    // Schedule Modal Form
    if (action === 'add-schedule') {
      title = 'Schedule Training Appointment';
      const val = record || {};
      const today = new Date().toISOString().split('T')[0];

      const memberOptions = isAdmin()
        ? members.map(m => `<option value="${escapeHTML(m.name)}" ${val.memberName === m.name ? 'selected' : ''}>${escapeHTML(m.name)}</option>`).join('')
        : `<option value="${escapeHTML(currentUser.name)}" selected>${escapeHTML(currentUser.name)}</option>`;

      const workoutOptions = workouts.map(w => `
        <option value="${escapeHTML(w.name)}" ${val.workoutName === w.name ? 'selected' : ''}>${escapeHTML(w.name)} (${w.duration}m)</option>
      `).join('');

      html = `
        <div class="form-group">
          <label>Member *</label>
          <select id="sMember" class="form-control">${memberOptions}</select>
        </div>
        <div class="form-group">
          <label>Workout Routine *</label>
          <select id="sWorkout" class="form-control">${workoutOptions || '<option>General Strength</option>'}</select>
        </div>
        <div class="form-group">
          <label>Session Date *</label>
          <input type="date" id="sDate" class="form-control" value="${val.date || today}" required>
        </div>
        <div class="form-group">
          <label>Session Time *</label>
          <input type="time" id="sTime" class="form-control" value="${val.time || '08:30'}" required>
        </div>
      `;
    }

    // Progress Modal Form
    if (action === 'add-progress') {
      title = 'Log Fitness Measurement';
      const today = new Date().toISOString().split('T')[0];

      const memberOptions = isAdmin()
        ? members.map(m => `<option value="${escapeHTML(m.name)}">${escapeHTML(m.name)}</option>`).join('')
        : `<option value="${escapeHTML(currentUser.name)}" selected>${escapeHTML(currentUser.name)}</option>`;

      html = `
        <div class="form-group">
          <label>Member *</label>
          <select id="pMember" class="form-control">${memberOptions}</select>
        </div>
        <div class="form-group">
          <label>Date Logged *</label>
          <input type="date" id="pDate" class="form-control" value="${today}" required>
        </div>
        <div class="form-group">
          <label>Body Weight (kg) *</label>
          <input type="number" step="0.1" min="30" max="300" id="pWeight" class="form-control" placeholder="e.g. 74.5" required>
        </div>
        <div class="form-group">
          <label>Estimated Body Fat (%) *</label>
          <input type="number" step="0.1" min="3" max="65" id="pBodyFat" class="form-control" placeholder="e.g. 16.5" required>
        </div>
        <div class="form-group">
          <label>Personal Best / Notes</label>
          <textarea id="pNotes" class="form-control" rows="2" placeholder="e.g. Broke bench PR, felt high energy during warmups."></textarea>
        </div>
      `;
    }

    titleEl.textContent = title;
    fieldsEl.innerHTML = html;
    overlay.classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    modalAction = null;
    modalRecordId = null;
  }

  function initModal() {
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

    document.getElementById('modalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('modalAlert');

      function showError(msg) {
        alertEl.className = 'alert-banner alert-error show';
        alertEl.innerHTML = `<span>⚠️</span> <span>${escapeHTML(msg)}</span>`;
      }

      // Member Add/Edit
      if (modalAction === 'add-member') {
        const name = document.getElementById('mName').value.trim();
        const email = document.getElementById('mEmail').value.trim().toLowerCase();
        const phone = document.getElementById('mPhone').value.trim();
        const plan = document.getElementById('mPlan').value;
        const status = document.getElementById('mStatus').value;

        if (name.length < 2) return showError('Full name must be at least 2 characters.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');

        const members = db.get(KEYS.MEMBERS);
        if (members.some(m => m.email.toLowerCase() === email)) {
          return showError('A member record with this email already exists.');
        }

        members.push({
          id: Date.now(),
          name,
          email,
          phone,
          plan,
          status,
          joinedDate: new Date().toISOString().split('T')[0]
        });

        db.set(KEYS.MEMBERS, members);
        closeModal();
        renderMembers();
        renderDashboard();
        showToast('Member added successfully!');
      }

      if (modalAction === 'edit-member') {
        const name = document.getElementById('mName').value.trim();
        const email = document.getElementById('mEmail').value.trim().toLowerCase();
        const phone = document.getElementById('mPhone').value.trim();
        const plan = document.getElementById('mPlan').value;
        const status = document.getElementById('mStatus').value;

        if (name.length < 2) return showError('Full name must be at least 2 characters.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');

        const members = db.get(KEYS.MEMBERS);
        const idx = members.findIndex(m => m.id === modalRecordId);
        if (idx !== -1) {
          members[idx] = { ...members[idx], name, email, phone, plan, status };
          db.set(KEYS.MEMBERS, members);
        }

        closeModal();
        renderMembers();
        renderDashboard();
        showToast('Member updated.');
      }

      // Workout Add/Edit
      if (modalAction === 'add-workout') {
        const name = document.getElementById('wName').value.trim();
        const category = document.getElementById('wCategory').value;
        const duration = parseInt(document.getElementById('wDuration').value, 10);
        const description = document.getElementById('wDesc').value.trim();

        if (name.length < 2) return showError('Workout name is required.');
        if (!duration || duration <= 0) return showError('Duration must be positive minutes.');

        const workouts = db.get(KEYS.WORKOUTS);
        workouts.push({
          id: Date.now(),
          name,
          category,
          duration,
          description: description || 'Comprehensive training routine.'
        });

        db.set(KEYS.WORKOUTS, workouts);
        closeModal();
        renderWorkouts();
        renderDashboard();
        showToast('New workout program published!');
      }

      if (modalAction === 'edit-workout') {
        const name = document.getElementById('wName').value.trim();
        const category = document.getElementById('wCategory').value;
        const duration = parseInt(document.getElementById('wDuration').value, 10);
        const description = document.getElementById('wDesc').value.trim();

        if (name.length < 2) return showError('Workout name is required.');

        const workouts = db.get(KEYS.WORKOUTS);
        const idx = workouts.findIndex(w => w.id === modalRecordId);
        if (idx !== -1) {
          workouts[idx] = { ...workouts[idx], name, category, duration, description };
          db.set(KEYS.WORKOUTS, workouts);
        }

        closeModal();
        renderWorkouts();
        renderDashboard();
        showToast('Workout plan updated.');
      }

      // Schedule Add
      if (modalAction === 'add-schedule') {
        const memberName = document.getElementById('sMember').value;
        const workoutName = document.getElementById('sWorkout').value;
        const date = document.getElementById('sDate').value;
        const time = document.getElementById('sTime').value;

        if (!date || !time) return showError('Please choose both date and time.');

        const schedules = db.get(KEYS.SCHEDULES);
        schedules.push({
          id: Date.now(),
          memberName,
          workoutName,
          date,
          time,
          status: 'Scheduled'
        });

        db.set(KEYS.SCHEDULES, schedules);
        closeModal();
        renderSchedules();
        renderDashboard();
        showToast('Training session confirmed!');
      }

      // Progress Add
      if (modalAction === 'add-progress') {
        const memberName = document.getElementById('pMember').value;
        const date = document.getElementById('pDate').value;
        const weight = parseFloat(document.getElementById('pWeight').value);
        const bodyFat = parseFloat(document.getElementById('pBodyFat').value);
        const notes = document.getElementById('pNotes').value.trim();

        if (!weight || weight <= 0) return showError('Please provide a valid weight in kg.');
        if (isNaN(bodyFat) || bodyFat < 0 || bodyFat > 100) return showError('Please provide a valid body fat %.');

        const progressLogs = db.get(KEYS.PROGRESS);
        progressLogs.unshift({
          id: Date.now(),
          memberName,
          date,
          weight,
          bodyFat,
          notes
        });

        db.set(KEYS.PROGRESS, progressLogs);
        closeModal();
        renderProgress();
        showToast('Fitness metrics logged!');
      }
    });
  }

  // =========================================================================
  // PUBLIC GLOBAL METHODS FOR INLINE BUTTONS
  // =========================================================================
  window.app = {
    switchTab,

    // Member actions
    updateMemberStatus: (id, newStatus) => {
      const members = db.get(KEYS.MEMBERS);
      const m = members.find(item => item.id === id);
      if (m) {
        m.status = newStatus;
        db.set(KEYS.MEMBERS, members);
        renderMembers();
        renderDashboard();
        showToast(`Status updated to ${newStatus} for ${m.name}`);
      }
    },
    editMember: (id) => {
      const members = db.get(KEYS.MEMBERS);
      const m = members.find(item => item.id === id);
      if (m) openModal('edit-member', m);
    },
    deleteMember: (id) => {
      if (!confirm('Are you sure you want to permanently delete this member record?')) return;
      let members = db.get(KEYS.MEMBERS);
      members = members.filter(m => m.id !== id);
      db.set(KEYS.MEMBERS, members);
      renderMembers();
      renderDashboard();
      showToast('Member record removed.');
    },

    // Workout actions
    editWorkout: (id) => {
      const workouts = db.get(KEYS.WORKOUTS);
      const w = workouts.find(item => item.id === id);
      if (w) openModal('edit-workout', w);
    },
    deleteWorkout: (id) => {
      if (!confirm('Delete this workout routine?')) return;
      let workouts = db.get(KEYS.WORKOUTS);
      workouts = workouts.filter(w => w.id !== id);
      db.set(KEYS.WORKOUTS, workouts);
      renderWorkouts();
      renderDashboard();
      showToast('Workout plan deleted.');
    },
    bookWorkoutForSelf: (workoutName) => {
      openModal('add-schedule', {
        workoutName,
        memberName: currentUser.name
      });
    },

    // Schedule actions
    updateScheduleStatus: (id, newStatus) => {
      const schedules = db.get(KEYS.SCHEDULES);
      const s = schedules.find(item => item.id === id);
      if (s) {
        s.status = newStatus;
        db.set(KEYS.SCHEDULES, schedules);
        renderSchedules();
        renderDashboard();
        showToast(`Session marked as ${newStatus}`);
      }
    },
    deleteSchedule: (id) => {
      if (!confirm('Remove this appointment from schedule?')) return;
      let schedules = db.get(KEYS.SCHEDULES);
      schedules = schedules.filter(s => s.id !== id);
      db.set(KEYS.SCHEDULES, schedules);
      renderSchedules();
      renderDashboard();
      showToast('Appointment removed.');
    },

    // Progress actions
    deleteProgress: (id) => {
      if (!confirm('Delete this progress measurement entry?')) return;
      let progressLogs = db.get(KEYS.PROGRESS);
      progressLogs = progressLogs.filter(p => p.id !== id);
      db.set(KEYS.PROGRESS, progressLogs);
      renderProgress();
      showToast('Progress record removed.');
    }
  };

  // =========================================================================
  // BOOTSTRAP APPLICATION
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initSeedData();
    initAuth();
    initNavigation();
    initMembers();
    initWorkouts();
    initSchedules();
    initProgress();
    initProfile();
    initModal();

    // Check existing session
    const savedUser = db.get(KEYS.SESSION, null);
    if (savedUser) {
      loginUser(savedUser);
    } else {
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('appSection').classList.add('hidden');
    }
  });

})();
