import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Tabs, Empty, Alert, Spin, Popconfirm } from 'antd';
import { FormOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, ReloadOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { deleteComplaint, getComplaints } from '../api/complaints';
import { useRole } from '../context/RoleContext';
import type { Complaint } from '../types/complaint';
import { CitizenVerificationCard } from '../components/CitizenVerificationCard';
import { ComplaintCard } from '../components/complaints/ComplaintCard';

export const CitizenPortal: React.FC = () => {
  const { user, isCitizen } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('my-complaints');
  const [deletingComplaintId, setDeletingComplaintId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['citizen-complaints', user?.id],
    queryFn: () => getComplaints(),
  });

  const complaints: Complaint[] = data?.complaints || [];

  // Filter complaints belonging to this citizen or system
  const myComplaints = user
    ? complaints.filter((c) => !c.citizen_id || c.citizen_id === user.id)
    : complaints;

  const pendingVerification = myComplaints.filter((c) => c.status === 'Resolved');
  const activeComplaints = myComplaints.filter((c) => ['New', 'Under Review', 'Assigned', 'In Progress', 'Reopened'].includes(c.status));
  const resolvedComplaints = myComplaints.filter((c) => c.status === 'Resolved');

  const handleDeleteComplaint = async (id: string) => {
    setDeletingComplaintId(id);
    try {
      await deleteComplaint(id);
      await refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete complaint');
    } finally {
      setDeletingComplaintId(null);
    }
  };

  if (!user && !isCitizen) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert
          message="Authentication Required"
          description="Please log in to your Citizen account to access your grievances."
          type="info"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/login?tab=citizen')}>
              Log In to Citizen Portal
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header Profile Banner */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(22, 119, 255, 0.08) 0%, rgba(9, 88, 217, 0.02) 100%)',
          border: '1px solid rgba(22, 119, 255, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#1677ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <UserOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Welcome, {user?.name || 'Citizen User'}</h2>
              <span style={{ color: '#8c8c8c', fontSize: 14 }}>
                Citizen ID: <code>{user?.id || 'USER-CITIZEN'}</code> | {user?.email}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button type="primary" icon={<FormOutlined />} size="large" onClick={() => navigate('/submit')}>
              Submit New Grievance
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Overview Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Total Complaints" value={myComplaints.length} prefix={<FileTextOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Active & In Progress" value={activeComplaints.length} prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Awaiting Verification" value={pendingVerification.length} prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Resolved" value={resolvedComplaints.length} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>

      {/* Action Tabs */}
      <Card style={{ borderRadius: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'my-complaints',
              label: `My Registered Complaints (${myComplaints.length})`,
              children: isLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
              ) : myComplaints.length === 0 ? (
                <Empty description="No grievances submitted yet. Click below to file your first complaint." style={{ padding: 40 }}>
                  <Button type="primary" icon={<FormOutlined />} onClick={() => navigate('/submit')}>
                    File a Complaint
                  </Button>
                </Empty>
              ) : (
                <>
                  {/* Mobile: Horizontal scroll cards */}
                  <div className="md:hidden">
                    <div 
                      className="complaints-scroll-container flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
                      style={{
                        scrollbarWidth: 'thin',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      {myComplaints.map((complaint) => (
                        <div 
                          key={complaint.id}
                          className="flex-shrink-0 snap-start"
                          style={{ width: '300px' }}
                        >
                          <div className="relative">
                            <ComplaintCard complaint={complaint} />
                            {complaint.status === 'New' && complaint.citizen_id === user?.id && (
                              <div className="absolute top-2 right-2">
                                <Popconfirm
                                  title="Delete this complaint?"
                                  description="This cannot be undone."
                                  onConfirm={() => handleDeleteComplaint(complaint.id)}
                                  okText="Delete"
                                  okButtonProps={{ danger: true, loading: deletingComplaintId === complaint.id }}
                                >
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deletingComplaintId === complaint.id}
                                    size="small"
                                    aria-label={`Delete complaint ${complaint.id}`}
                                  />
                                </Popconfirm>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {myComplaints.length > 0 && (
                      <div className="text-center mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                        ← Swipe to see more complaints →
                      </div>
                    )}
                  </div>

                  {/* Desktop: Table view */}
                  <div className="hidden md:block">
                    <Table
                      dataSource={myComplaints}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        {
                          title: 'Complaint ID',
                          dataIndex: 'id',
                          key: 'id',
                          render: (id: string) => <Link to={`/complaints/${id}`} style={{ fontWeight: 600 }}>{id}</Link>,
                        },
                        {
                          title: 'Summary',
                          dataIndex: 'summary',
                          key: 'summary',
                          render: (text: string, record: Complaint) => text || record.raw_text.slice(0, 60) + '...',
                        },
                        {
                          title: 'Category',
                          dataIndex: 'category',
                          key: 'category',
                          render: (cat: string) => <Tag color="blue">{cat}</Tag>,
                        },
                        {
                          title: 'Location',
                          dataIndex: 'location',
                          key: 'location',
                        },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status: string) => {
                            const colors: Record<string, string> = {
                              New: 'blue',
                              'Under Review': 'orange',
                              Assigned: 'cyan',
                              'In Progress': 'processing',
                              Resolved: 'success',
                              'Rejected / Spam': 'error',
                              Reopened: 'warning',
                            };
                            return <Tag color={colors[status] || 'default'}>{status}</Tag>;
                          },
                        },
                        {
                          title: 'Submitted On',
                          dataIndex: 'created_at',
                          key: 'created_at',
                          render: (d: string) => d ? new Date(d).toLocaleDateString() : 'N/A',
                        },
                        {
                          title: 'Action',
                          key: 'action',
                          render: (_, record: Complaint) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Button type="link" onClick={() => navigate(`/complaints/${record.id}`)}>
                                View Details
                              </Button>
                              {record.status === 'New' && record.citizen_id === user?.id && (
                                <Popconfirm
                                  title="Delete this complaint?"
                                  description="This cannot be undone."
                                  onConfirm={() => handleDeleteComplaint(record.id)}
                                  okText="Delete"
                                  okButtonProps={{ danger: true, loading: deletingComplaintId === record.id }}
                                >
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deletingComplaintId === record.id}
                                    aria-label={`Delete complaint ${record.id}`}
                                  />
                                </Popconfirm>
                              )}
                            </div>
                          ),
                        },
                      ]}
                    />
                  </div>
                </>
              ),
            },
            {
              key: 'pending-verification',
              label: `Action Required: Verification Needed (${pendingVerification.length})`,
              children: pendingVerification.length === 0 ? (
                <Empty description="No complaints awaiting citizen verification." style={{ padding: 40 }} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                  {pendingVerification.map((complaint) => (
                    <CitizenVerificationCard
                      key={complaint.id}
                      complaint={complaint}
                      onSuccess={() => refetch()}
                    />
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
