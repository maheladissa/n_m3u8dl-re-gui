import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/HistoryPage.css';

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  
  // This is just a placeholder with mock data
  const mockHistory = [
    { id: 1, url: 'https://example.com/video1.m3u8', date: '2023-10-15', status: 'completed' },
    { id: 2, url: 'https://example.com/video2.m3u8', date: '2023-10-14', status: 'failed' },
    { id: 3, url: 'https://example.com/video3.m3u8', date: '2023-10-13', status: 'completed' },
  ];

  return (
    <div className="history-page">
      <h1>{t('historyPage.title')}</h1>
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>{t('historyPage.table.id')}</th>
              <th>{t('historyPage.table.url')}</th>
              <th>{t('historyPage.table.date')}</th>
              <th>{t('historyPage.table.status')}</th>
              <th>{t('historyPage.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td className="url-cell">{item.url}</td>
                <td>{item.date}</td>
                <td>
                  <span className={`status-badge ${item.status}`}>
                    {t(`historyPage.status.${item.status}`)}
                  </span>
                </td>
                <td>
                  <button className="action-button">{t('historyPage.actions.view')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPage; 