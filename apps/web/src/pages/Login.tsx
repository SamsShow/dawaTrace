import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { setAuth } from '../lib/auth';

export default function Login() {
  const [nodeId, setNodeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nodeId || !password) {
      setError('Node ID and password are required.');
      return;
    }
    setAuth('dev-token', { nodeId, orgRole: 'REGULATOR', mspId: 'OrgRegulatorMSP' });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <h1 className="text-base font-semibold">DawaTrace</h1>
          <p className="text-xs text-muted-foreground mt-1">Sign in to the regulatory portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nodeId">Node ID</Label>
            <Input
              id="nodeId"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              placeholder="CDSCO-REG-001"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
