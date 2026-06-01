import { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider, useToast, LoadButton } from './utils.jsx';
import { I } from './data.jsx';
import { LoginScreen, RegisterScreen, EmailVerifyScreen, RecoverPasswordScreen, OrgSetupScreen } from './auth.jsx';
import { Shell } from './shell.jsx';
import { DashboardOwner, DashboardAdmin, DashboardTeacher, FacultyList, FacultyDetail, GroupList, GroupDetail, StudentList, StudentDetail, EmployeeList, EmployeeDetail, PositionList, ParentList, ParentDetail, SubjectList, SubjectDetail, UserList, DeleteRequests, AuditLog, TeacherMySubjects, MyProfileScreen } from './screens.jsx';
import { ProfileScreen } from './profile.jsx';
import { OrgFormModal, FacultyFormModal, FacultyDetailModal, GroupFormModal, AssignSubjectModal, SubjectAddTeacherModal, StudentFormModal, UploadDocModal, ParentFormModal, ParentAddStudentModal, DeleteConfirmModal, EmployeeFormModal, EmployeeAssignSubjectModal, EmployeeAddTaughtSubjectModal, EmployeeSetHeadteacherModal, PositionFormModal, SubjectFormModal, UserFormModal, UserSetPasswordModal, ApproveDeleteModal, AuditDiffModal, LogoutModal, OrgDeleteConfirmModal, OwnerDirectDeleteModal, NoteModal } from './modals.jsx';
import api from './api.js';

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

  const MODAL_COMPONENTS = {
    orgForm:                  OrgFormModal,
    facultyForm:              FacultyFormModal,
    facultyDetail:            FacultyDetailModal,
    groupForm:                GroupFormModal,
    assignSubject:            AssignSubjectModal,
    subjectAddTeacher:        SubjectAddTeacherModal,
    studentForm:              StudentFormModal,
    uploadDoc:                UploadDocModal,
    parentForm:               ParentFormModal,
    parentAddStudent:         ParentAddStudentModal,
    deleteConfirm:            DeleteConfirmModal,
    employeeForm:             EmployeeFormModal,
    employeeAssignSubject:    EmployeeAssignSubjectModal,
    employeeAddTaughtSubject: EmployeeAddTaughtSubjectModal,
    employeeSetHeadteacher:   EmployeeSetHeadteacherModal,
    positionForm:             PositionFormModal,
    subjectForm:              SubjectFormModal,
    userForm:                 UserFormModal,
    userSetPassword:          UserSetPasswordModal,
    approveDelete:            ApproveDeleteModal,
    auditDiff:                AuditDiffModal,
    ownerDirectDelete:        OwnerDirectDeleteModal,
    recordNote:               NoteModal,
  };

  const renderModal = () => {
    if (!modal) return null;
    if (modal.name === 'logout') {
      return <LogoutModal onClose={closeModal} onLogout={handleLogout} />;
    }
    const Comp = MODAL_COMPONENTS[modal.name];
    if (!Comp) return null;

    let data = modal.data;
    const extra = {};
    if (modal.name === 'orgForm') {
      data = { ...data, onDone: (d) => { modal.data?.onDone?.(d); loadUser(); } };
    } else if (modal.name === 'recordNote') {
      data = { ...data, currentUserRole: currentUser?.role };
    } else if (modal.name === 'facultyDetail' || modal.name === 'userForm') {
      extra.openModal = openModal;
    } else if (modal.name === 'auditDiff') {
      extra.onNavigate = handleNavigate;
    }
    return <Comp data={data} onClose={closeModal} {...extra} />;
  };

  if (loading) {
    return <div className="loading-fullscreen">Загрузка…</div>;
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

    if (currentScreen === 'my-profile') {
      return <MyProfileScreen {...sharedProps} />;
    }

    if (currentScreen === 'my-subjects') {
      return <TeacherMySubjects {...sharedProps} />;
    }

    if (currentScreen === 'subjects') {
      return <SubjectList {...sharedProps} />;
    }

    if (currentScreen === 'subject-detail') {
      return <SubjectDetail {...sharedProps} subjectId={navExtra?.subjectId} filterEmployeeId={navExtra?.filterEmployeeId} backTo={navExtra?.backTo} />;
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
        <div className="screen-placeholder">
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
