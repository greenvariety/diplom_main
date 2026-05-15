import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastProvider } from './utils.jsx';
import { LoginScreen, RegisterScreen, SeedPhraseScreen, RecoverPasswordScreen } from './auth.jsx';
import { Shell } from './shell.jsx';
import { DashboardOwner, DashboardAdmin, DashboardSuper, DashboardTeacher, OrganizationList, FacultyList, GroupList, GroupDetail, StudentList, StudentDetail, EmployeeList, EmployeeDetail, PositionList, ParentList, ParentDetail, SubjectList, UserList, DeleteRequests, AuditLog } from './screens.jsx';
import { OrgFormModal, FacultyFormModal, FacultyDetailModal, GroupFormModal, AssignSubjectModal, StudentFormModal, TransferModal, UploadDocModal, ParentFormModal, ParentAddStudentModal, DeleteConfirmModal, EmployeeFormModal, EmployeeAssignSubjectModal, PositionFormModal, SubjectFormModal, UserFormModal, UserSetPasswordModal, ApproveDeleteModal, AuditDiffModal } from './modals.jsx';
import api from './api.js';

function AuthFlow({ onAuthenticated }) {
  const [screen, setScreen] = useState('login');
  const [seedWords, setSeedWords] = useState([]);

  if (screen === 'register') {
    return (
      <RegisterScreen
        onDone={(words) => { setSeedWords(words); setScreen('seed'); }}
        onBack={() => setScreen('login')}
      />
    );
  }
  if (screen === 'seed') {
    return (
      <SeedPhraseScreen
        seedWords={seedWords}
        onDone={() => onAuthenticated()}
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

  const renderScreen = () => {
    if (currentScreen === 'dashboard') {
      const role = currentUser.role;
      if (role === 'teacher') return <DashboardTeacher {...sharedProps} />;
      if (role === 'admin')   return <DashboardAdmin   {...sharedProps} />;
      return <DashboardOwner {...sharedProps} />;
    }

    if (currentScreen === 'org-list') {
      return <OrganizationList {...sharedProps} onUserRefresh={loadUser} />;
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
