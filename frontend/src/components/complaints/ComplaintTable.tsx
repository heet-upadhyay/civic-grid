import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import type { Complaint } from '../../types/complaint';
import { SeverityBadge } from '../ui/SeverityBadge';
import { UrgencyBadge } from '../ui/UrgencyBadge';
import { CategoryBadge } from '../ui/CategoryBadge';
import { useI18n } from '../../i18n/useI18n';

interface ComplaintTableProps {
  complaints: Complaint[];
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const ComplaintTable: React.FC<ComplaintTableProps> = ({ complaints, loading }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const columns: ColumnsType<Complaint> = [
    {
      title: t.complaints.colSummary,
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (text: string) => (
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          {text}
        </span>
      ),
    },
    {
      title: t.complaints.colCategory,
      dataIndex: 'category',
      key: 'category',
      width: 160,
      render: (cat: string) => <CategoryBadge category={cat} />,
    },
    {
      title: t.complaints.colLocation,
      dataIndex: 'location',
      key: 'location',
      width: 110,
      render: (loc: string) => (
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{loc}</span>
      ),
    },
    {
      title: t.complaints.colSeverity,
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (sev: Complaint['severity']) => <SeverityBadge severity={sev} />,
    },
    {
      title: t.complaints.colUrgency,
      dataIndex: 'urgency',
      key: 'urgency',
      width: 110,
      render: (urg: Complaint['urgency']) => <UrgencyBadge urgency={urg} />,
    },
    {
      title: t.complaints.colDate,
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (d: string) => (
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{formatDate(d)}</span>
      ),
    },
  ];

  return (
    <Table<Complaint>
      columns={columns}
      dataSource={complaints}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 15, showSizeChanger: false }}
      onRow={(record) => ({
        onClick: () => navigate(`/complaints/${record.id}`),
        style: { cursor: 'pointer' },
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') navigate(`/complaints/${record.id}`);
        },
      })}
      className="civicgrid-table"
      size="middle"
    />
  );
};
