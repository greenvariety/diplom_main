import { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider, useToast, LoadButton } from './utils.jsx';
import { I } from './data.jsx';
import { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen } from './auth.jsx';
import { Shell } from './shell.jsx';
import { DashboardOwner, DashboardAdmin, DashboardSuper, DashboardTeacher, DashboardSecretary, FacultyList, FacultyDetail, GroupList, GroupDetail, StudentList, StudentDetail, EmployeeList, EmployeeDetail, PositionList, ParentList, ParentDetail, SubjectList, SubjectDetail, UserList, DeleteRequests, AuditLog } from './screens.jsx';
import { ProfileScreen } from './profile.jsx';
import { OrgFormModal, FacultyFormModal, FacultyDetailModal, GroupFormModal, AssignSubjectModal, StudentFormModal, UploadDocModal, ParentFormModal, ParentAddStudentModal, DeleteConfirmModal, EmployeeFormModal, EmployeeAssignSubjectModal, EmployeeAddTaughtSubjectModal, EmployeeSetHeadteacherModal, PositionFormModal, SubjectFormModal, UserFormModal, UserSetPasswordModal, ApproveDeleteModal, AuditDiffModal, LogoutModal, OrgDeleteConfirmModal, OwnerDirectDeleteModal, NoteModal } from './modals.jsx';
import api from './api.js';
import { HtmlTasksPanel } from './dev-tasks.jsx';

function AuthFlow({ onAuthenticated }) {
  const [screen, setScreen] = useState('login');
  const [verifyData, setVerifyData] = useState(null);
  const [savedRegisterVals, setSavedRegisterVals] = useState(null);

  if (screen === 'register') {
    return (
      <RegisterScreen
        initialVals={savedRegisterVals}
        onDone={(data) => { setSavedRegisterVals(data.formVals); setVerifyData(data); setScreen('verify-email'); }}
        onBack={() => setScreen('login')}
      />
    );
  }
  if (screen === 'verify-email') {
    return (
      <EmailVerifyScreen
        maskedEmail={verifyData?.maskedEmail}
        login={verifyData?.login}
        onDone={() => onAuthenticated()}
        onBack={() => setScreen('register')}
      />
    );
  }
  if (screen === 'recover') {
    return (
      <RecoverPasswordScreen
        onBack={() => setScreen('login')}
        onDone={() => setScreen('login')}
      />
    );
  }
  return (
    <LoginScreen
      onLogin={() => onAuthenticated()}
      onRegister={() => setScreen('register')}
      onRecover={() => setScreen('recover')}
    />
  );
}

/* ============================================================
   OrgPickerScreen - выбор / создание / управление организациями
   Показывается после логина и при клике на название орг в топбаре.
   ============================================================ */
function OrgPickerScreen({ user, onOrgSelected, onLogout, onBack, onProfile }) {
  const toast = useToast();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgModal, setOrgModal] = useState(null); // null | { org?, onDone }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    const endpoint = user.role === 'owner' ? '/organizations/' : '/organizations/allowed/';
    api.get(endpoint)
      .then(r => { setOrgs(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pickOrg = async (orgId, orgName, isActive = false) => {
    if (isActive) { onOrgSelected(); return; }
    try {
      await api.post(`/organizations/${orgId}/switch/`);
      toast.push(`Организация «${orgName}» выбрана`, { kind: 'ok' });
      onOrgSelected();
    } catch {
      toast.push('Ошибка при выборе организации', { kind: 'err' });
    }
  };

  const openCreate = () => {
    setOrgModal({
      org: null,
      onDone: async (newOrg) => {
        setOrgModal(null);
        try {
          await api.post(`/organizations/${newOrg.id}/switch/`);
          onOrgSelected();
        } catch {
          load();
        }
      },
    });
  };

  const openEdit = (org) => {
    setOrgModal({
      org,
      onDone: () => { setOrgModal(null); load(); },
    });
  };

  const deleteOrg = (org) => { setDeleteTarget(org); };

  const brand = (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <img src="/logo.png" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: '50%', margin: '0 auto 10px', display: 'block' }} alt="" />
      <div style={{ fontWeight: 600, fontSize: 15 }}>АИСК</div>
    </div>
  );

  const footer = (
    <div className="modal-foot" style={{ padding: '10px 16px', gap: 8 }}>
      {onBack && (
        <button className="btn btn-secondary btn-sm" onClick={onBack}>{I.back} Назад</button>
      )}
      {onProfile && (
        <button className="btn btn-ghost btn-sm" onClick={onProfile} style={{ fontSize: 12 }}>
          {I.user} Профиль
        </button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
        {I.logout} Выйти из аккаунта
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
        Загрузка…
      </div>
    );
  }

  if (user.role !== 'owner') {
    if (orgs.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', padding: 24 }}>
          {brand}
          <div className="card screen-fade-in" style={{ width: '100%', maxWidth: 400 }}>
            <div className="card-body" style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <h2 style={{ marginBottom: 8 }}>Ожидайте назначения</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
                Администратор ещё не назначил вас в организацию. Обратитесь к владельцу системы.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={onLogout}>{I.logout} Выйти</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', padding: 24 }}>
        {brand}
        <div className="card screen-fade-in" style={{ width: '100%', maxWidth: 480 }}>
          <div className="card-body" style={{ padding: 28 }}>
            <h2 style={{ marginBottom: 6 }}>Выберите организацию</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Выберите организацию для работы.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => pickOrg(org.id, org.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color .15s, background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-alt)'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{org.code}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{org.name}</div>
                  </div>
                  {I.chevr}
                </button>
              ))}
            </div>
          </div>
          {footer}
        </div>
      </div>
    );
  }

  const org = orgs[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', padding: 24 }}>
      {brand}
      <div className="card screen-fade-in" style={{ width: '100%', maxWidth: 480 }}>
        <div className="card-body" style={{ padding: 28 }}>
          {org ? (
            <>
              <h2 style={{ marginBottom: 6 }}>Ваша организация</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Войдите или отредактируйте данные организации.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0, overflow: 'hidden' }}>
                  {org.photo ? <img src={org.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : org.code}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{org.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>
                    {org.students} студ. · {org.employees} сотр.{org.founded_date ? ` · Основана: ${org.founded_date}` : ''}
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(org)} title="Редактировать">{I.pencil}</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteOrg(org)} title="Удалить организацию" style={{ color: 'var(--bad-fg)' }}>{I.trash}</button>
              </div>
              <button className="btn btn-primary" onClick={() => pickOrg(org.id, org.name, true)} style={{ width: '100%', justifyContent: 'center' }}>
                {I.check} Войти
              </button>
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: 6 }}>Создайте организацию</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Для начала работы создайте вашу организацию.</p>
              <button className="btn btn-primary" onClick={openCreate} style={{ width: '100%', justifyContent: 'center' }}>
                {I.plus} Создать организацию
              </button>
            </>
          )}
        </div>
        {footer}
      </div>
      {deleteTarget && (
        <OrgDeleteConfirmModal
          data={{ org: deleteTarget, onDone: () => { setDeleteTarget(null); load(); } }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {orgModal && (
        <OrgFormModal
          data={{ org: orgModal.org, onDone: orgModal.onDone }}
          onClose={() => setOrgModal(null)}
        />
      )}
    </div>
  );
}

function AppShell({ onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [navExtra, setNavExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { name, data }

  const loadUser = (afterSwitch = false) => {
    api.get('/me/').then(r => {
      const user = r.data;
      if (!afterSwitch) {
        // Для owner: показываем пикер только если нет организации
        // Для остальных ролей: всегда показываем пикер для выбора организации
        const showPicker = user.role === 'owner' ? !user.institution : true;
        setCurrentUser({ ...user, _showPicker: showPicker });
      } else {
        setCurrentUser(user);
      }
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      onLogout();
    });
  };

  useEffect(() => { loadUser(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    onLogout();
  };

  const handleNavigate = (screen, extra = null) => {
    window.history.pushState({ screen, extra }, '');
    setCurrentScreen(screen);
    setNavExtra(extra);
  };

  useEffect(() => {
    window.history.replaceState({ screen: 'dashboard', extra: null }, '');

    const handlePopState = (e) => {
      const screen = e.state?.screen || 'dashboard';
      const extra = e.state?.extra || null;
      setCurrentScreen(screen);
      setNavExtra(extra);
    };

    const handleKeyDown = (e) => {
      if (!e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); window.history.back(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); window.history.forward(); }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openModal = (name, data) => setModal({ name, data });
  const closeModal = () => setModal(null);

  const renderModal = () => {
    if (!modal) return null;
    if (modal.name === 'orgForm') {
      return <OrgFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'facultyForm') {
      return <FacultyFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'facultyDetail') {
      return <FacultyDetailModal data={modal.data} onClose={closeModal} openModal={openModal} />;
    }
    if (modal.name === 'groupForm') {
      return <GroupFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'assignSubject') {
      return <AssignSubjectModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'studentForm') {
      return <StudentFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'uploadDoc') {
      return <UploadDocModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'parentForm') {
      return <ParentFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'parentAddStudent') {
      return <ParentAddStudentModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'deleteConfirm') {
      return <DeleteConfirmModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'employeeForm') {
      return <EmployeeFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'employeeAssignSubject') {
      return <EmployeeAssignSubjectModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'employeeAddTaughtSubject') {
      return <EmployeeAddTaughtSubjectModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'employeeSetHeadteacher') {
      return <EmployeeSetHeadteacherModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'positionForm') {
      return <PositionFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'subjectForm') {
      return <SubjectFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'userForm') {
      return <UserFormModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'userSetPassword') {
      return <UserSetPasswordModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'approveDelete') {
      return <ApproveDeleteModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'auditDiff') {
      return <AuditDiffModal data={modal.data} onClose={closeModal} onNavigate={handleNavigate} />;
    }
    if (modal.name === 'logout') {
      return <LogoutModal onClose={closeModal} onLogout={handleLogout} />;
    }
    if (modal.name === 'ownerDirectDelete') {
      return <OwnerDirectDeleteModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'recordNote') {
      return <NoteModal data={{ ...modal.data, currentUserRole: currentUser?.role }} onClose={closeModal} />;
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
        Загрузка…
      </div>
    );
  }

  const sharedProps = {
    currentUser,
    onNavigate: handleNavigate,
    onLogout: handleLogout,
    openModal,
  };

  const goToProfile = () => setCurrentScreen('profile');

  if (currentScreen === 'profile') {
    return (
      <>
        <ProfileScreen
          {...sharedProps}
          onUserUpdated={(data) => setCurrentUser(u => ({ ...u, ...data }))}
        />
        {renderModal()}
      </>
    );
  }

  if (currentUser._showPicker || !currentUser.institution) {
    return <OrgPickerScreen user={currentUser} onOrgSelected={() => loadUser(true)} onLogout={handleLogout} onProfile={goToProfile} />;
  }

  const renderScreen = () => {
    if (currentScreen === 'dashboard') {
      const role = currentUser.role;
      if (role === 'teacher')   return <DashboardTeacher   {...sharedProps} />;
      if (role === 'secretary') return <DashboardSecretary {...sharedProps} />;
      if (role === 'admin')     return <DashboardAdmin     {...sharedProps} />;
      return <DashboardOwner {...sharedProps} />;
    }

    if (currentScreen === 'org-picker') {
      return (
        <OrgPickerScreen
          user={currentUser}
          onOrgSelected={() => { loadUser(true); handleNavigate('dashboard'); }}
          onLogout={handleLogout}
          onBack={() => { loadUser(true); handleNavigate('dashboard'); }}
          onProfile={() => handleNavigate('profile')}
        />
      );
    }

    if (currentScreen === 'faculties') {
      return <FacultyList {...sharedProps} />;
    }

    if (currentScreen === 'faculty-detail') {
      return <FacultyDetail {...sharedProps} facultyId={navExtra?.facultyId} />;
    }

    if (currentScreen === 'groups') {
      return <GroupList {...sharedProps} />;
    }

    if (currentScreen === 'group-detail') {
      return <GroupDetail {...sharedProps} groupId={navExtra?.groupId} />;
    }

    if (currentScreen === 'students') {
      return <StudentList {...sharedProps} />;
    }

    if (currentScreen === 'student-detail') {
      return <StudentDetail {...sharedProps} studentId={navExtra?.studentId} />;
    }

    if (currentScreen === 'employees') {
      return <EmployeeList {...sharedProps} filterPositionId={navExtra?.filterPositionId} filterPositionName={navExtra?.filterPositionName} filterPositionRoleType={navExtra?.filterPositionRoleType} />;
    }

    if (currentScreen === 'employee-detail') {
      return <EmployeeDetail {...sharedProps} employeeId={navExtra?.employeeId} />;
    }

    if (currentScreen === 'positions') {
      return <PositionList {...sharedProps} />;
    }

    if (currentScreen === 'subjects') {
      return <SubjectList {...sharedProps} />;
    }

    if (currentScreen === 'subject-detail') {
      return <SubjectDetail {...sharedProps} subjectId={navExtra?.subjectId} filterEmployeeId={navExtra?.filterEmployeeId} />;
    }

    if (currentScreen === 'parents') {
      return <ParentList {...sharedProps} />;
    }

    if (currentScreen === 'parent-detail') {
      return <ParentDetail {...sharedProps} parentId={navExtra?.parentId} />;
    }

    if (currentScreen === 'users') {
      return <UserList {...sharedProps} />;
    }

    if (currentScreen === 'delreq') {
      return <DeleteRequests {...sharedProps} />;
    }

    if (currentScreen === 'audit') {
      return <AuditLog {...sharedProps} />;
    }

    return (
      <Shell currentUser={currentUser} active={currentScreen} onNavigate={handleNavigate} onLogout={handleLogout} openModal={openModal}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          Раздел будет доступен в следующих обновлениях
        </div>
      </Shell>
    );
  };

  return (
    <>
      {renderScreen()}
      {renderModal()}
    </>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(
    () => !!localStorage.getItem('access_token')
  );

  useEffect(() => {
    const onForceLogout = () => setAuthenticated(false);
    window.addEventListener('auth:logout', onForceLogout);
    return () => window.removeEventListener('auth:logout', onForceLogout);
  }, []);

  if (!authenticated) {
    return (
      <ToastProvider>
        <AuthFlow onAuthenticated={() => setAuthenticated(true)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppShell onLogout={() => setAuthenticated(false)} />
      <HtmlTasksPanel />
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
