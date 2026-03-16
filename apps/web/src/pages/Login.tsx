import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuth } from '../lib/auth';

export default function Login() {
  const [nodeId, setNodeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Placeholder: in production call /api/auth/login
    // For dev, accept any credentials and create a mock REGULATOR token
    if (!nodeId || !password) {
      setError('Please enter node ID and password');
      return;
    }

    // Mock auth for dev
    const mockToken = 'dev-token';
    setAuth(mockToken, { nodeId, orgRole: 'REGULATOR', mspId: 'OrgRegulatorMSP' });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-700">DawaTrace</h1>
          <p className="text-sm text-gray-400 mt-1">Regulator Portal</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Node ID</label>
            <input
              type="text"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              placeholder="CDSCO-REG-001"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
