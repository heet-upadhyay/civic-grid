import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Tabs, Alert, Modal, Form, Input, Select, Spin, Space } from 'antd';
import { SafetyOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, SolutionOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { getComplaints, resolveComplaint, assignComplaint } from '../api/complaints';
import { useRole } from '../context/RoleContext';
import type { Complaint } from '../types/complaint';

export const OfficerPortal: React.FC = () => {
  const { user, isOfficer } = useRole();
  const navigate = useNavigate();

  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const [formResolve] = Form.useForm();
  const [formAssign] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['officer-complaints', user?.id],
    queryFn: () => getComplaints(),
  });

  const complaints: Complaint[] = data?.complaints || [];

  // Scoped to officer's assigned department / ward
  const officerDepartment = user?.department || 'Municipal Public Works';
  const officerWard = user?.ward || 'Ward 12';

  const scopedComplaints = complaints.filter((c) => {
    if (user?.role === 'ADMIN') return true;
    if (!c.department) return true; // Show unassigned to department
    return c.department.toLowerCase() === officerDepartment.toLowerCase();
  });

  const inProgressComplaints = scopedComplaints.filter((c) => ['Assigned', 'In Progress', 'Reopened'].includes(c.status));
  const slaBreachedComplaints = scopedComplaints.filter((c) => {
    if (!c.sla_deadline) return false;
    return new Date(c.sla_deadline).getTime() < Date.now() && c.status !== 'Resolved';
  });
  const resolvedComplaints = scopedComplaints.filter((c) => c.status === 'Resolved');

  const handleOpenResolve = (record: Complaint) => {
    setSelectedComplaint(record);
    formResolve.resetFields();
    setResolveModalVisible(true);
  };

  const handleSubmitResolution = async (values: any) => {
    if (!selectedComplaint) return;
    setActionLoading(true);
    try {
      await resolveComplaint(selectedComplaint.id, {
        note: values.note,
        evidence_image: values.evidence_image,
      });
      setResolveModalVisible(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to submit resolution proof');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAssign = (record: Complaint) => {
    setSelectedComplaint(record);
    formAssign.setFieldsValue({
      department: record.department || officerDepartment,
      ward: record.ward || officerWard,
      assigned_to: record.assigned_to || user?.name || '',
    });
    setAssignModalVisible(true);
  };

  const handleAssignSubmit = async (values: any) => {
    if (!selectedComplaint) return;
    setActionLoading(true);
    try {
      await assignComplaint(selectedComplaint.id, values);
      setAssignModalVisible(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to assign complaint');
    } finally {
      setActionLoading(false);
    }
  };

  if (!user && !isOfficer) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Alert
          message="Officer Authentication Required"
          description="Please log in with your official municipal officer identification code to access the officer desk."
          type="warning"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/login?tab=officer')}>
              Log In to Officer Desk
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Officer Header Scope Banner */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(250, 140, 22, 0.08) 0%, rgba(212, 107, 8, 0.02) 100%)',
          border: '1px solid rgba(250, 140, 22, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#fa8c16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <SafetyOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Officer Desk — {user?.name || 'Officer'}</h2>
              <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="orange">Department: {officerDepartment}</Tag>
                <Tag color="gold">Assigned Scope: {officerWard}</Tag>
                <Tag color="blue">Officer ID: {user?.id}</Tag>
              </div>
            </div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh Workload
          </Button>
        </div>
      </Card>

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Department Workload" value={scopedComplaints.length} prefix={<SolutionOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="In Progress / Assigned" value={inProgressComplaints.length} prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="SLA Breaches & Urgent" value={slaBreachedComplaints.length} prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />} valueStyle={{ color: slaBreachedComplaints.length > 0 ? '#ff4d4f' : 'inherit' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Resolutions Submitted" value={resolvedComplaints.length} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>

      {/* SLA Breach Warning */}
      {slaBreachedComplaints.length > 0 && (
        <Alert
          message={`Attention: ${slaBreachedComplaints.length} complaint(s) in your scope have breached SLA resolution deadlines!`}
          description="SLA breach auto-escalation has raised their urgency to Emergency. Priority resolution required."
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 12 }}
        />
      )}

      {/* Main Workload Table Card */}
      <Card style={{ borderRadius: 16 }}>
        <Tabs
          defaultActiveKey="all"
          items={[
            {
              key: 'all',
              label: `Department Complaints (${scopedComplaints.length})`,
              children: isLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
              ) : (
                <Table
                  dataSource={scopedComplaints}
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
                      render: (t: string, r: Complaint) => t || r.raw_text.slice(0, 50) + '...',
                    },
                    {
                      title: 'Severity / Urgency',
                      key: 'severity',
                      render: (_, r: Complaint) => (
                        <Space>
                          <Tag color={r.severity === 'Critical' ? 'magenta' : r.severity === 'High' ? 'red' : 'gold'}>{r.severity}</Tag>
                          <Tag color={r.urgency === 'Emergency' ? 'red' : 'volcano'}>{r.urgency}</Tag>
                        </Space>
                      ),
                    },
                    {
                      title: 'Ward',
                      dataIndex: 'ward',
                      key: 'ward',
                      render: (w: string, r: Complaint) => w || r.location,
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
                          Reopened: 'error',
                        };
                        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
                      },
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record: Complaint) => (
                        <Space size="small">
                          {['New', 'Under Review'].includes(record.status) && (
                            <Button size="small" type="primary" onClick={() => handleOpenAssign(record)}>
                              Assign
                            </Button>
                          )}
                          {['Assigned', 'In Progress', 'Reopened'].includes(record.status) && (
                            <Button size="small" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => handleOpenResolve(record)}>
                              Resolve
                            </Button>
                          )}
                          <Button size="small" onClick={() => navigate(`/complaints/${record.id}`)}>
                            View
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'in-progress',
              label: `In Progress (${inProgressComplaints.length})`,
              children: (
                <Table
                  dataSource={inProgressComplaints}
                  rowKey="id"
                  columns={[
                    { title: 'ID', dataIndex: 'id', render: (id: string) => <Link to={`/complaints/${id}`}>{id}</Link> },
                    { title: 'Summary', dataIndex: 'summary' },
                    { title: 'Assigned To', dataIndex: 'assigned_to', render: (a: string) => a || 'Unassigned' },
                    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color="processing">{s}</Tag> },
                    {
                      title: 'Action',
                      render: (_, record: Complaint) => (
                        <Button type="primary" style={{ background: '#52c41a' }} onClick={() => handleOpenResolve(record)}>
                          Submit Resolution Proof
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Submit Resolution Proof Modal */}
      <Modal
        title={`Submit Resolution Proof for ${selectedComplaint?.id}`}
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        footer={null}
      >
        <Form form={formResolve} layout="vertical" onFinish={handleSubmitResolution}>
          <Form.Item name="note" label="Resolution Proof Note" rules={[{ required: true, min: 5, message: 'Please describe the resolution work completed' }]}>
            <Input.TextArea rows={4} placeholder="Describe the physical repair, sanitation cleanup, or work completed by officers..." />
          </Form.Item>
          <Form.Item name="evidence_image" label="Evidence Photo URL (Optional)">
            <Input placeholder="https://example.com/photo_proof.jpg" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setResolveModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={actionLoading} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
              Mark as Resolved
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Assign Complaint Modal */}
      <Modal
        title={`Assign Complaint ${selectedComplaint?.id}`}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
      >
        <Form form={formAssign} layout="vertical" onFinish={handleAssignSubmit}>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ward" label="Ward / Zone">
            <Input />
          </Form.Item>
          <Form.Item name="assigned_to" label="Assigned Officer Name">
            <Input placeholder="e.g. Officer R. Sharma" />
          </Form.Item>
          <Form.Item name="sla_hours" label="Custom SLA Resolution Window (Hours)">
            <Select
              options={[
                { label: '24 Hours (Urgent)', value: 24 },
                { label: '48 Hours (Standard)', value: 48 },
                { label: '72 Hours (Routine)', value: 72 },
                { label: '120 Hours (Extended)', value: 120 },
              ]}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setAssignModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={actionLoading}>
              Assign Complaint
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
