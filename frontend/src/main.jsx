import { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider, useToast, LoadButton } from './utils.jsx';
import { I } from './data.jsx';
import { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen, OrgSetupScreen } from './auth.jsx';
import { Shell } from './shell.jsx';
import { DashboardOwner, DashboardAdmin, DashboardSuper, DashboardTeacher, DashboardSecretary, FacultyList, FacultyDetail, GroupList, GroupDetail, StudentList, StudentDetail, EmployeeList, EmployeeDetail, PositionList, ParentList, ParentDetail, SubjectList, SubjectDetail, UserList, DeleteRequests, AuditLog } from './screens.jsx';
import { ProfileScreen } from './profile.jsx';
import { OrgFormModal, FacultyFormModal, FacultyDetailModal, GroupFormModal, AssignSubjectModal, SubjectAddTeacherModal, StudentFormModal, UploadDocModal, ParentFormModal, ParentAddStudentModal, DeleteConfirmModal, EmployeeFormModal, EmployeeAssignSubjectModal, EmployeeAddTaughtSubjectModal, EmployeeSetHeadteacherModal, PositionFormModal, SubjectFormModal, UserFormModal, UserSetPasswordModal, ApproveDeleteModal, AuditDiffModal, LogoutModal, OrgDeleteConfirmModal, OwnerDirectDeleteModal, NoteModal } from './modals.jsx';
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
        onDone={() => setScreen('org-setup')}
        onBack={() => setScreen('register')}
      />
    );
  }
  if (screen === 'org-setup') {
    return <OrgSetupScreen onDone={() => onAuthenticated()} />;
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

function AppShell({ onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [navExtra, setNavExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { name, data }

  const loadUser = () => {
    api.get('/me/').then(r => {
      setCurrentUser(r.data);
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
      const origOnDone = modal.data?.onDone;
      const orgData = { ...modal.data, onDone: (d) => { origOnDone?.(d); loadUser(); } };
      return <OrgFormModal data={orgData} onClose={closeModal} />;
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
    if (modal.name === 'subjectAddTeacher') {
      return <SubjectAddTeacherModal data={modal.data} onClose={closeModal} />;
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
      return <UserFormModal data={modal.data} onClose={closeModal} openModal={openModal} />;
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

  const renderScreen = () => {
    if (currentScreen === 'dashboard') {
      const role = currentUser.role;
      if (role === 'teacher')   return <DashboardTeacher   {...sharedProps} />;
      if (role === 'secretary') return <DashboardSecretary {...sharedProps} />;
      if (role === 'admin')     return <DashboardAdmin     {...sharedProps} />;
      return <DashboardOwner {...sharedProps} />;
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
