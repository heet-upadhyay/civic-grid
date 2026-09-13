import React, { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Alert, Tag, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'citizen';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { login, register, loginAsOfficer } = useRole();
  const navigate = useNavigate();

  const handleCitizenSubmit = async (values: any) => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegisterMode) {
      const res = await register(values.name, values.email, values.password);
      if (res.success) {
        setSuccessMessage('Registration successful! Redirecting to Citizen Portal...');
        setTimeout(() => navigate('/citizen'), 1000);
      } else {
        setErrorMessage(res.error || 'Registration failed');
      }
    } else {
      const res = await login(values.email, values.password);
      if (res.success) {
        navigate('/citizen');
      } else {
        setErrorMessage(res.error || 'Login failed');
      }
    }
    setLoading(false);
  };

  const handleOfficerSubmit = async (values: any) => {
    setLoading(true);
    setErrorMessage(null);
    const res = await loginAsOfficer(values.officerId, values.password);
    if (res.success) {
      navigate('/officer');
    } else {
      setErrorMessage(res.error || 'Invalid Officer Credentials');
    }
    setLoading(false);
  };

  const handleAdminSubmit = async (values: any) => {
    setLoading(true);
    setErrorMessage(null);
    const res = await login(values.email, values.password);
    if (res.success && (res.user?.role === 'ADMIN' || values.email === 'admin@civicgrid.gov.in')) {
      navigate('/admin');
    } else if (res.success) {
      setErrorMessage('Access denied. Account does not have Administrator privileges.');
    } else {
      setErrorMessage(res.error || 'Invalid Admin Credentials');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '20px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          CivicGrid Portal
        </Title>
        <Text type="secondary" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Authenticated Municipal Grievance & Accountability Platform</Text>
      </div>

      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {errorMessage && <Alert message={errorMessage} type="error" showIcon style={{ marginBottom: 20 }} />}
        {successMessage && <Alert message={successMessage} type="success" showIcon style={{ marginBottom: 20 }} />}

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          centered
          size="small"
          items={[
            {
              key: 'citizen',
              label: (
                <span>
                  <UserOutlined /> Citizen Portal
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <Text strong style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}>{isRegisterMode ? 'Create Citizen Account' : 'Sign in to Citizen Account'}</Text>
                    <Button type="link" onClick={() => setIsRegisterMode(!isRegisterMode)} style={{ padding: 0, fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                      {isRegisterMode ? 'Already registered? Login' : 'Need an account? Register'}
                    </Button>
                  </div>

                  <Form layout="vertical" onFinish={handleCitizenSubmit}>
                    {isRegisterMode && (
                      <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter your full name' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Ananya Sharma" size="large" />
                      </Form.Item>
                    )}
                    <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
                      <Input prefix={<MailOutlined />} placeholder="citizen.a@example.com" size="large" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter your password' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                      {isRegisterMode ? 'Register Account' : 'Login to Citizen Portal'}
                    </Button>
                  </Form>
                  <div style={{ marginTop: 16, background: 'rgba(22, 119, 255, 0.05)', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }}>
                      <strong>Demo Citizen Credentials:</strong><br />
                      • Email: <code>citizen.a@example.com</code> | Password: <code>password123</code>
                    </Text>
                  </div>
                </div>
              ),
            },
            {
              key: 'officer',
              label: (
                <span>
                  <SafetyOutlined /> Officer Portal
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Tag color="blue" style={{ marginBottom: 16, width: '100%', textAlign: 'center', padding: 6, fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }}>
                    Scoped Department & Ward Officer Access
                  </Tag>
                  <Form layout="vertical" onFinish={handleOfficerSubmit}>
                    <Form.Item name="officerId" label="Officer ID / Code" rules={[{ required: true, message: 'Please enter Officer ID' }]}>
                      <Input prefix={<SafetyOutlined />} placeholder="OFFICER-2026" size="large" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter password' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                      Login to Officer Portal
                    </Button>
                  </Form>
                  <div style={{ marginTop: 16, background: 'rgba(22, 119, 255, 0.05)', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }}>
                      <strong>Demo Officer Credentials:</strong><br />
                      • Officer ID: <code>OFFICER-2026</code> (Public Works / Ward 12)<br />
                      • Password: <code>password123</code>
                    </Text>
                  </div>
                </div>
              ),
            },
            {
              key: 'admin',
              label: (
                <span>
                  <TeamOutlined /> Admin Portal
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Tag color="purple" style={{ marginBottom: 16, width: '100%', textAlign: 'center', padding: 6, fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }}>
                    Municipal Governance & Account Management
                  </Tag>
                  <Form layout="vertical" onFinish={handleAdminSubmit}>
                    <Form.Item name="email" label="Administrator Email" rules={[{ required: true, message: 'Please enter Admin email' }]}>
                      <Input prefix={<MailOutlined />} placeholder="admin@civicgrid.gov.in" size="large" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter password' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                      Login to Admin Portal
                    </Button>
                  </Form>
                  <div style={{ marginTop: 16, background: 'rgba(114, 46, 209, 0.05)', padding: 12, borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.75rem)' }}>
                      <strong>Demo Admin Credentials:</strong><br />
                      • Email: <code>admin@civicgrid.gov.in</code> | Password: <code>admin123</code>
                    </Text>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
