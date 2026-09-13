import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Tabs, Modal, Form, Input, Select, Alert, Spin, Space, Popconfirm } from 'antd';
import { TeamOutlined, UserAddOutlined, SolutionOutlined, SafetyCertificateOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { getComplaints, getAdminUsers, createAdminUser, updateAdminUser, deleteComplaint } from '../api/complaints';
import { useRole, type UserProfile } from '../context/RoleContext';
import type { Complaint } from '../types/complaint';

export const AdminPortal: React.FC = () => {
  const { user, isAdmin } = useRole();
  const navigate = useNavigate();

  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const { data: complaintsData, isLoading: complaintsLoading, refetch: refetchComplaints } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: () => getComplaints(),
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers(),
  });

  const complaints: Complaint[] = complaintsData?.complaints || [];
  const users: UserProfile[] = usersData || [
    { id: 'USER-ADMIN-001', name: 'System Administrator', email: 'admin@civicgrid.gov.in', role: 'ADMIN' },
    { id: 'OFFICER-2026', name: 'Officer R. Sharma', email: 'officer1@civicgrid.gov.in', role: 'OFFICER', department: 'Municipal Public Works', ward: 'Ward 12' },
    { id: 'OFFICER-HEALTH', name: 'Officer S. Gupta', email: 'officer2@civicgrid.gov.in', role: 'OFFICER', department: 'Health & Sanitation', ward: 'Ward 7' },
    { id: 'USER-CITIZEN-001', name: 'Ananya Sharma', email: 'citizen.a@example.com', role: 'CITIZEN' },
    { id: 'USER-CITIZEN-002', name: 'Bharat Kumar', email: 'citizen.b@example.com', role: 'CITIZEN' },
  ];

  const officers = users.filter((u) => u.role === 'OFFICER');
  const citizens = users.filter((u) => u.role === 'CITIZEN');

  const handleCreateUser = async (values: any) => {
    setLoading(true);
    try {
      await createAdminUser(values);
      setCreateUserModalOpen(false);
      formCreate.resetFields();
      refetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user account');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditUser = (record: UserProfile) => {
    setSelectedUser(record);
    formEdit.setFieldsValue({
      name: record.name,
      role: record.role,
      department: record.department || '',
      ward: record.ward || '',
      status: record.status || 'ACTIVE',
    });
    setEditUserModalOpen(true);
  };

  const handleUpdateUserSubmit = async (values: any) => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await updateAdminUser(selectedUser.id, values);
      setEditUserModalOpen(false);
      refetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    try {
      await deleteComplaint(id);
      refetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to delete complaint');
    }
  };

  if (!user && !isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert
          message="Administrator Authorization Required"
          description="Access restricted to municipal platform administrators."
          type="error"
          showIcon
          action={
            <Button type="primary" style={{ background: '#722ed1', borderColor: '#722ed1' }} onClick={() => navigate('/login?tab=admin')}>
              Log In to Admin Portal
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Admin Header Banner */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(114, 46, 209, 0.08) 0%, rgba(83, 29, 171, 0.02) 100%)',
          border: '1px solid rgba(114, 46, 209, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#722ed1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <TeamOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Admin Control Panel — {user?.name || 'Administrator'}</h2>
              <span style={{ color: '#8c8c8c', fontSize: 14 }}>
                Municipal System Administration & Department Scoping Engine
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button type="primary" icon={<UserAddOutlined />} style={{ background: '#722ed1', borderColor: '#722ed1' }} onClick={() => { formCreate.resetFields(); setCreateUserModalOpen(true); }}>
              Add Officer / User
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { refetchUsers(); refetchComplaints(); }}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Total System Complaints" value={complaints.length} prefix={<SolutionOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Registered Officers" value={officers.length} prefix={<SafetyCertificateOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Registered Citizens" value={citizens.length} prefix={<TeamOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Total Accounts" value={users.length} prefix={<TeamOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
      </Row>

      {/* Main Admin Tabs */}
      <Card style={{ borderRadius: 16 }}>
        <Tabs
          defaultActiveKey="users"
          items={[
            {
              key: 'users',
              label: `User & Officer Accounts (${users.length})`,
              children: usersLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
              ) : (
                <Table
                  dataSource={users}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'User ID',
                      dataIndex: 'id',
                      key: 'id',
                      render: (id: string) => <code>{id}</code>,
                    },
                    {
                      title: 'Name',
                      dataIndex: 'name',
                      key: 'name',
                      render: (n: string) => <strong>{n}</strong>,
                    },
                    {
                      title: 'Email',
                      dataIndex: 'email',
                      key: 'email',
                    },
                    {
                      title: 'Role',
                      dataIndex: 'role',
                      key: 'role',
                      render: (role: string) => {
                        const colors: Record<string, string> = {
                          ADMIN: 'purple',
                          OFFICER: 'orange',
                          CITIZEN: 'blue',
                        };
                        return <Tag color={colors[role] || 'default'}>{role}</Tag>;
                      },
                    },
                    {
                      title: 'Assigned Department',
                      dataIndex: 'department',
                      key: 'department',
                      render: (d: string) => d ? <Tag color="cyan">{d}</Tag> : <span style={{ color: '#bfbfbf' }}>N/A</span>,
                    },
                    {
                      title: 'Assigned Ward',
                      dataIndex: 'ward',
                      key: 'ward',
                      render: (w: string) => w ? <Tag color="gold">{w}</Tag> : <span style={{ color: '#bfbfbf' }}>N/A</span>,
                    },
                    {
                      title: 'Action',
                      key: 'action',
                      render: (_, record: UserProfile) => (
                        <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenEditUser(record)}>
                          Edit Scope
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'complaints',
              label: `System-Wide Complaints (${complaints.length})`,
              children: complaintsLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
              ) : (
                <Table
                  dataSource={complaints}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'ID',
                      dataIndex: 'id',
                      key: 'id',
                      render: (id: string) => <Link to={`/complaints/${id}`}>{id}</Link>,
                    },
                    {
                      title: 'Summary',
                      dataIndex: 'summary',
                      key: 'summary',
                    },
                    {
                      title: 'Department',
                      dataIndex: 'department',
                      key: 'department',
                      render: (d: string) => d ? <Tag color="blue">{d}</Tag> : <Tag>Unassigned</Tag>,
                    },
                    {
                      title: 'Ward',
                      dataIndex: 'ward',
                      key: 'ward',
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (s: string) => <Tag color={s === 'Resolved' ? 'success' : 'processing'}>{s}</Tag>,
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record: Complaint) => (
                        <Space>
                          <Button size="small" onClick={() => navigate(`/complaints/${record.id}`)}>
                            View
                          </Button>
                          <Popconfirm title="Delete this complaint permanently?" onConfirm={() => handleDeleteComplaint(record.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />}>
                              Delete
                            </Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Create New User Modal */}
      <Modal
        title="Create New System User / Officer Account"
        open={createUserModalOpen}
        onCancel={() => setCreateUserModalOpen(false)}
        footer={null}
      >
        <Form form={formCreate} layout="vertical" onFinish={handleCreateUser} initialValues={{ role: 'OFFICER' }}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Enter full name' }]}>
            <Input placeholder="e.g. Officer K. Varma" />
          </Form.Item>
          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="officer3@civicgrid.gov.in" />
          </Form.Item>
          <Form.Item name="password" label="Initial Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="password123" />
          </Form.Item>
          <Form.Item name="role" label="Account Role" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'OFFICER (Municipal Official)', value: 'OFFICER' },
                { label: 'ADMIN (System Administrator)', value: 'ADMIN' },
                { label: 'CITIZEN (Public Resident)', value: 'CITIZEN' },
              ]}
            />
          </Form.Item>
          <Form.Item name="department" label="Assigned Department (For Officers)">
            <Select
              placeholder="Select Department"
              options={[
                { label: 'Municipal Public Works', value: 'Municipal Public Works' },
                { label: 'Health & Sanitation', value: 'Health & Sanitation' },
                { label: 'Water Supply & Sewerage', value: 'Water Supply & Sewerage' },
                { label: 'Electricity & Lighting', value: 'Electricity & Lighting' },
                { label: 'Traffic & Transport', value: 'Traffic & Transport' },
              ]}
            />
          </Form.Item>
          <Form.Item name="ward" label="Assigned Ward Scope (For Officers)">
            <Input placeholder="e.g. Ward 12 or All" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateUserModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
              Create Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit User Scope Modal */}
      <Modal
        title={`Edit Scope for ${selectedUser?.name}`}
        open={editUserModalOpen}
        onCancel={() => setEditUserModalOpen(false)}
        footer={null}
      >
        <Form form={formEdit} layout="vertical" onFinish={handleUpdateUserSubmit}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'CITIZEN', value: 'CITIZEN' },
                { label: 'OFFICER', value: 'OFFICER' },
                { label: 'ADMIN', value: 'ADMIN' },
              ]}
            />
          </Form.Item>
          <Form.Item name="department" label="Assigned Department">
            <Input placeholder="e.g. Municipal Public Works" />
          </Form.Item>
          <Form.Item name="ward" label="Assigned Ward Scope">
            <Input placeholder="e.g. Ward 12 or All" />
          </Form.Item>
          <Form.Item name="status" label="Account Status">
            <Select
              options={[
                { label: 'ACTIVE', value: 'ACTIVE' },
                { label: 'DISABLED', value: 'DISABLED' },
              ]}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEditUserModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Scope Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
