import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LiveFeed from './components/LiveFeed';
import Sidebar from './components/Sidebar';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <Router>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        <Sidebar setToken={setToken} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-24 md:pb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background -z-10" />
          <Routes>
            <Route path="/dashboard" element={<Dashboard token={token} />} />
            <Route path="/live" element={<LiveFeed token={token} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
