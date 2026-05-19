import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider, useToast, LoadButton } from './utils.jsx';
import { I } from './data.jsx';
import { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen } from './auth.jsx';
import { Shell } from './shell.jsx';
import { DashboardOwner, DashboardAdmin, DashboardSuper, DashboardTeacher, FacultyList, GroupList, GroupDetail, StudentList, StudentDetail, EmployeeList, EmployeeDetail, PositionList, ParentList, ParentDetail, SubjectList, UserList, DeleteRequests, AuditLog } from './screens.jsx';
import { OrgFormModal, FacultyFormModal, FacultyDetailModal, GroupFormModal, AssignSubjectModal, StudentFormModal, TransferModal, UploadDocModal, ParentFormModal, ParentAddStudentModal, DeleteConfirmModal, EmployeeFormModal, EmployeeAssignSubjectModal, PositionFormModal, SubjectFormModal, UserFormModal, UserSetPasswordModal, ApproveDeleteModal, AuditDiffModal, LogoutModal, OrgDeleteConfirmModal } from './modals.jsx';
import api from './api.js';

function AuthFlow({ onAuthenticated }) {
  const [screen, setScreen] = useState('login');
  const [verifyData, setVerifyData] = useState(null);

  if (screen === 'register') {
    return (
      <RegisterScreen
        onDone={(data) => { setVerifyData(data); setScreen('verify-email'); }}
        onBack={() => setScreen('login')}
      />
    );
  }
  if (screen === 'verify-email') {
    return (
      <EmailVerifyScreen
        maskedEmail={verifyData?.maskedEmail}
        login={verifyData?.login}
        debugCode={verifyData?.debugCode}
        onDone={() => onAuthenticated()}
        onBack={() => setScreen('register')}
      />
    );
  }
  if (screen === 'recover') {
    return (
      <RecoverPasswordScreen
        onBack={() => setScreen('login')}
        onDone={() => onAuthenticated()}
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
function OrgPickerScreen({ user, onOrgSelected, onLogout, onBack }) {
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
    <div className="modal-foot" style={{ padding: '10px 16px' }}>
      {onBack && (
        <button className="btn btn-secondary btn-sm" onClick={onBack}>{I.back} Назад</button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: onBack ? 'auto' : 0 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', padding: 24 }}>
      {brand}
      <div className="card screen-fade-in" style={{ width: '100%', maxWidth: 520 }}>
        <div className="card-body" style={{ padding: 28 }}>
          <h2 style={{ marginBottom: 6 }}>
            {orgs.length > 0 ? 'Мои организации' : 'Создайте организацию'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: orgs.length > 0 ? 16 : 16 }}>
            {orgs.length > 0
              ? 'Выберите организацию для работы, отредактируйте или создайте новую.'
              : 'У вас ещё нет организаций. Создайте первую.'}
          </p>

          {orgs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {orgs.map(org => (
                <div key={org.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: org.active ? 'var(--accent-soft)' : 'var(--surface-alt)', border: `1px solid ${org.active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: org.active ? 'var(--accent)' : 'var(--surface)', color: org.active ? '#fff' : 'var(--text-muted)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    {org.photo
                      ? <img src={org.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : org.code}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>
                      {org.students} студ. · {org.employees} сотр.{org.founded_date ? ` · Основана: ${org.founded_date}` : ''}
                      {org.active && <span style={{ color: 'var(--accent)', fontWeight: 600, marginLeft: 6 }}>· активна</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                    onClick={() => pickOrg(org.id, org.name, org.active)}
                  >
                    {org.active ? I.check : I.swap}
                    {org.active ? 'Войти' : 'Выбрать'}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(org)} title="Редактировать">{I.pencil}</button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteOrg(org)} title="Удалить организацию" style={{ color: 'var(--bad-fg)' }}>{I.trash}</button>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary" onClick={openCreate} style={{ width: '100%', justifyContent: 'center' }}>
            {I.plus} Создать организацию
          </button>
        </div>
        {footer}
      </div>
      {deleteTarget && (
        <OrgDeleteConfirmModal
          data={{ org: deleteTarget, onDone: (id) => setOrgs(prev => prev.filter(o => o.id !== id)) }}
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
        // Всегда показываем пикер организации при открытии приложения
        setCurrentUser({ ...user, _showPicker: true });
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
    setCurrentScreen(screen);
    setNavExtra(extra);
  };

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
    if (modal.name === 'transfer') {
      return <TransferModal data={modal.data} onClose={closeModal} />;
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
      return <AuditDiffModal data={modal.data} onClose={closeModal} />;
    }
    if (modal.name === 'logout') {
      return <LogoutModal onClose={closeModal} onLogout={handleLogout} />;
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

  if (currentUser._showPicker || !currentUser.institution) {
    return <OrgPickerScreen user={currentUser} onOrgSelected={() => loadUser(true)} onLogout={handleLogout} />;
  }

  const sharedProps = {
    currentUser,
    onNavigate: handleNavigate,
    onLogout: handleLogout,
    openModal,
  };

  const renderScreen = () => {
    if (currentScreen === 'dashboard') {
      const role = currentUser.role;
      if (role === 'teacher') return <DashboardTeacher {...sharedProps} />;
      if (role === 'admin')   return <DashboardAdmin   {...sharedProps} />;
      return <DashboardOwner {...sharedProps} />;
    }

    if (currentScreen === 'org-picker') {
      return (
        <OrgPickerScreen
          user={currentUser}
          onOrgSelected={() => { loadUser(true); handleNavigate('dashboard'); }}
          onLogout={handleLogout}
          onBack={() => handleNavigate('dashboard')}
        />
      );
    }

    if (currentScreen === 'faculties') {
      return <FacultyList {...sharedProps} />;
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
      return <EmployeeList {...sharedProps} />;
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
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
