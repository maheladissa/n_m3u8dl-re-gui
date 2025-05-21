import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SideMenu.css';

interface SideMenuProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

const SideMenu: React.FC<SideMenuProps> = ({ onNavigate, currentPage }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    { id: 'home', label: t('sideMenu.home'), icon: '🏠' },
    { id: 'history', label: t('sideMenu.history'), icon: '📋' },
    { id: 'settings', label: t('sideMenu.settings'), icon: '⚙️' },
  ];

  return (
    <div className={`side-menu ${collapsed ? 'collapsed' : ''}`}>
      <div className="collapse-button" onClick={toggleCollapse}>
        {collapsed ? '❯' : '❮'}
      </div>
      <nav className="menu-items">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            {!collapsed && <span className="menu-label">{item.label}</span>}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default SideMenu; 