import {
  ArrowDownUp,
  BarChart3,
  Bell,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MapPin,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  User,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../state/AppContext.jsx';
import { exportCsvRows, exportRows, exportVisibleRows, printRows } from '../utils/exportExcel.js';
import { importColumns, importRowsFromFile } from '../utils/importSheet.js';

const columns = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['phoneNumber', 'Phone'],
  ['organization', 'Organization'],
  ['country', 'Country'],
  ['city', 'City'],
  ['fullAddress', 'Full Address'],
  ['cnic', 'CNIC'],
  ['dateOfBirth', 'Date of Birth'],
  ['gender', 'Gender'],
  ['notes', 'Notes']
];

const defaultColumnState = Object.fromEntries(columns.map(([key]) => [key, true]));
const sortableColumns = new Set(['name', 'email', 'phoneNumber', 'organization', 'country', 'city', 'cnic']);
const createEmptyImportRow = () => Object.fromEntries(importColumns.map(([key]) => [key, '']));
const navItems = [
  ['overview', Home, 'Dashboard'],
  ['records', Users, 'Records'],
  ['analytics', BarChart3, 'Analytics'],
  ['imports', Upload, 'Import/Export'],
  ['documents', FolderOpen, 'Documents'],
  ['reports', FileText, 'Reports'],
  ['settings', Settings, 'Settings'],
  ['profile', User, 'Profile']
];

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [importedRows, setImportedRows] = useState([]);
  const [filters, setFilters] = useState({ countries: [], cities: [], organizations: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [query, setQuery] = useState({
    search: '',
    country: '',
    city: '',
    organization: '',
    gender: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingImport, setSavingImport] = useState(false);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingSheet, setEditingSheet] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [columnState, setColumnState] = useState(() => {
    const saved = localStorage.getItem('pdm_columns');
    return saved ? { ...defaultColumnState, ...JSON.parse(saved) } : defaultColumnState;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pdm_theme') === 'dark');
  const [profilePhotos, setProfilePhotos] = useState(() => readLocalJson('pdm_photos', {}));
  const [documents, setDocuments] = useState(() => readLocalJson('pdm_documents', {}));
  const [history, setHistory] = useState(() => readLocalJson('pdm_history', {}));
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const showingSheetEditor = editingSheet || importedRows.length > 0;
  const visibleRows = showingSheetEditor ? importedRows : rows;
  const activeRows = useMemo(() => filterClientRows(rows, query), [rows, query]);
  const visibleColumns = showingSheetEditor
    ? importColumns
    : columns.filter(([key]) => columnState[key]);
  const validImportRows = useMemo(
    () => importedRows.filter((row) => hasRequiredImportFields(row)),
    [importedRows]
  );
  const selectedRowObjects = rows.filter((row) => selectedRows.includes(String(row.id)));
  const dashboardStats = useMemo(() => buildStats(rows, pagination.total), [rows, pagination.total]);
  const analytics = useMemo(() => buildAnalytics(activeRows), [activeRows]);
  const duplicateMap = useMemo(() => buildDuplicateMap(rows), [rows]);
  const notifications = useMemo(() => buildNotifications(importMessage, selectedRows.length, rows), [importMessage, selectedRows.length, rows]);
  const attachedDocumentCount = useMemo(
    () => Object.values(documents).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0),
    [documents]
  );

  const params = useMemo(() => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (['gender', 'dateFrom', 'dateTo'].includes(key)) continue;
      if (value) next.set(key, value);
    }
    return next.toString();
  }, [query]);

  useEffect(() => {
    localStorage.setItem('pdm_columns', JSON.stringify(columnState));
  }, [columnState]);

  useEffect(() => {
    localStorage.setItem('pdm_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('pdm_photos', JSON.stringify(profilePhotos));
  }, [profilePhotos]);

  useEffect(() => {
    localStorage.setItem('pdm_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('pdm_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let ignore = false;

    async function loadRows() {
      setLoading(true);
      setError('');
      try {
        const result = await apiRequest(`/personal-details?${params}`, { token });
        if (!ignore) {
          const data = Array.isArray(result.data) ? result.data.filter(Boolean) : [];
          setRows(data);
          setFilters({
            countries: Array.isArray(result.filters?.countries) ? result.filters.countries : [],
            cities: Array.isArray(result.filters?.cities) ? result.filters.cities : [],
            organizations: Array.isArray(result.filters?.organizations) ? result.filters.organizations : []
          });
          setPagination({
            page: Number(result.pagination?.page || 1),
            limit: Number(result.pagination?.limit || query.limit),
            total: Number(result.pagination?.total || 0),
            totalPages: Number(result.pagination?.totalPages || 1)
          });
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
          if (requestError.message.toLowerCase().includes('token')) logout();
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadRows();
    return () => {
      ignore = true;
    };
  }, [params, token, logout, refreshKey, query.limit]);

  function updateQuery(patch) {
    setQuery((current) => ({ ...current, ...patch, page: patch.page || 1 }));
  }

  function sortBy(column) {
    if (!sortableColumns.has(column)) return;
    setQuery((current) => ({
      ...current,
      sortBy: column,
      sortOrder: current.sortBy === column && current.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setError('');
    setImportMessage('');

    try {
      const imported = await importRowsFromFile(file);
      setImportedRows(imported);
      setEditingSheet(true);
      setImportMessage(imported.length ? `Imported ${imported.length} rows from ${file.name}.` : 'No usable rows found in that file.');
    } catch {
      setError('Could not read that file. Use an Excel, OpenDocument, or CSV sheet.');
    } finally {
      setImporting(false);
    }
  }

  function updateImportedCell(rowIndex, key, value) {
    setImportedRows((current) => current.map((row, index) => (
      index === rowIndex ? { ...row, [key]: value } : row
    )));
  }

  function removeImportedRow(rowIndex) {
    setImportedRows((current) => current.filter((_, index) => index !== rowIndex));
  }

  function addImportedRow() {
    setEditingSheet(true);
    setImportedRows((current) => [...current, createEmptyImportRow()]);
    setImportMessage('');
  }

  function clearImport() {
    setImportedRows([]);
    setEditingSheet(false);
    setImportMessage('');
  }

  function beginEditRow(row) {
    setError('');
    setImportMessage('');
    setEditingRowId(row.id);
    setEditDraft(rowToDraft(row));
  }

  function cancelEditRow() {
    setEditingRowId(null);
    setEditDraft({});
  }

  function updateEditCell(key, value) {
    setEditDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveEditedRow(id) {
    setSavingRowId(id);
    setError('');
    setImportMessage('');

    try {
      const result = await apiRequest(`/personal-details/${id}`, {
        token,
        method: 'PATCH',
        body: editDraft
      });
      setRows((current) => current.map((row) => (String(row.id) === String(id) ? result.data : row)));
      setActiveRecord((current) => (String(current?.id) === String(id) ? result.data : current));
      addHistory(id, `Edited ${new Date().toLocaleString()}`);
      setEditingRowId(null);
      setEditDraft({});
      setImportMessage('Row updated.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingRowId(null);
    }
  }

  async function deleteRow(row) {
    if (!window.confirm(`Delete ${row.name || 'this row'}?`)) return;

    setDeletingRowId(row.id);
    setError('');
    setImportMessage('');

    try {
      await apiRequest(`/personal-details/${row.id}`, {
        token,
        method: 'DELETE'
      });
      setRows((current) => current.filter((currentRow) => String(currentRow.id) !== String(row.id)));
      setSelectedRows((current) => current.filter((rowId) => rowId !== String(row.id)));
      setPagination((current) => ({
        ...current,
        total: Math.max(current.total - 1, 0)
      }));
      if (String(editingRowId) === String(row.id)) cancelEditRow();
      setActiveRecord((current) => (String(current?.id) === String(row.id) ? null : current));
      setImportMessage('Row deleted.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingRowId(null);
    }
  }

  async function deleteSelectedRows() {
    if (!selectedRows.length || !window.confirm(`Delete ${selectedRows.length} selected records?`)) return;
    for (const row of selectedRowObjects) {
      await deleteRowWithoutConfirm(row);
    }
    setSelectedRows([]);
    setImportMessage('Selected records deleted.');
    setRefreshKey((current) => current + 1);
  }

  async function deleteRowWithoutConfirm(row) {
    await apiRequest(`/personal-details/${row.id}`, { token, method: 'DELETE' });
  }

  async function saveImportedRows() {
    if (!importedRows.length) {
      setImportMessage('');
      setError('Add at least one row before saving.');
      return;
    }

    if (!validImportRows.length) {
      setImportMessage('');
      setError('Enter name, email, and phone before saving a row.');
      return;
    }

    setSavingImport(true);
    setError('');
    setImportMessage('');

    try {
      const result = await apiRequest('/personal-details/import', {
        token,
        method: 'POST',
        body: { rows: importedRows }
      });
      const now = new Date().toLocaleString();
      const nextHistory = { ...history };
      for (const row of result.data || []) {
        nextHistory[String(row.id)] = [`Created ${now}`];
      }
      setHistory(nextHistory);
      setImportedRows([]);
      setEditingSheet(false);
      setImportMessage(`Saved ${result.imported} imported rows${result.skipped ? ` and skipped ${result.skipped} incomplete rows` : ''}.`);
      setQuery((current) => ({ ...current, page: 1, sortBy: 'createdAt', sortOrder: 'desc' }));
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingImport(false);
    }
  }

  function addHistory(id, entry) {
    setHistory((current) => ({
      ...current,
      [String(id)]: [entry, ...(current[String(id)] || [])].slice(0, 8)
    }));
  }

  function toggleSelected(id) {
    setSelectedRows((current) => current.includes(String(id))
      ? current.filter((rowId) => rowId !== String(id))
      : [...current, String(id)]);
  }

  function toggleAllVisible() {
    const ids = rows.map((row) => String(row.id));
    setSelectedRows((current) => current.length === ids.length ? [] : ids);
  }

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeRecord) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotos((current) => ({ ...current, [String(activeRecord.id)]: reader.result }));
      addHistory(activeRecord.id, `Photo updated ${new Date().toLocaleString()}`);
    };
    reader.readAsDataURL(file);
  }

  function handleDocumentUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeRecord) return;

    setDocuments((current) => ({
      ...current,
      [String(activeRecord.id)]: [
        { name: file.name, size: file.size, addedAt: new Date().toISOString() },
        ...(current[String(activeRecord.id)] || [])
      ].slice(0, 6)
    }));
    addHistory(activeRecord.id, `Document attached ${new Date().toLocaleString()}`);
  }

  function exportTargetRows() {
    return selectedRowObjects.length ? selectedRowObjects : visibleRows;
  }

  function handleNavClick(event, sectionId) {
    event.preventDefault();
    setActiveSection(sectionId);
  }

  const activeNavLabel = navItems.find(([id]) => id === activeSection)?.[2] || 'Dashboard';
  const activeRecordIsEditing = activeRecord && String(editingRowId) === String(activeRecord.id);

  return (
    <main className={`dashboard-shell ${darkMode ? 'dark-mode' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <a href="#overview" onClick={(event) => handleNavClick(event, 'overview')} className="brand-link" title="Personal Details Manager">
            <Shield size={24} />
            <span>PDM</span>
          </a>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed((current) => !current)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {navItems.map(([id, Icon, label]) => (
            <a
              href={`#${id}`}
              key={id}
              className={activeSection === id ? 'active' : ''}
              onClick={(event) => handleNavClick(event, id)}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="profile-card">
          <span className="avatar small">{getInitials(user?.username || 'Admin')}</span>
          <div>
            <strong>{user?.username || 'Admin'}</strong>
            <span>Admin role</span>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div>
            <span className="view-eyebrow">{activeNavLabel}</span>
            <h1>Personal Details Manager</h1>
            <p>{activeSection === 'overview' ? `${pagination.total} records available across your current workspace` : `Manage ${activeNavLabel.toLowerCase()} in this workspace`}</p>
          </div>
          <div className="topbar-actions">
            <div className="notification-popover">
              <button className="secondary icon-only" title="Notifications">
                <Bell size={18} />
                {notifications.length ? <span className="notification-dot" /> : null}
              </button>
              <div className="notification-menu">
                {notifications.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
            <button className="secondary icon-button" onClick={() => setDarkMode((current) => !current)}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        {activeSection === 'overview' ? (
          <>
            <section id="overview" className="stat-grid">
              <StatCard label="Total Records" value={dashboardStats.total} tone="blue" />
              <StatCard label="Male" value={dashboardStats.male} tone="emerald" />
              <StatCard label="Female" value={dashboardStats.female} tone="pink" />
              <StatCard label="Countries" value={dashboardStats.countries} tone="amber" />
            </section>
            <section className="analytics-grid">
              <ChartPanel title="Country Distribution" items={analytics.countries} />
              <ChartPanel title="Gender Statistics" items={analytics.genders} />
              <ChartPanel title="Monthly Added Records" items={analytics.months} />
            </section>
          </>
        ) : null}

        {activeSection === 'analytics' ? (
          <section id="analytics" className="analytics-grid expanded">
            <ChartPanel title="Country Distribution" items={analytics.countries} />
            <ChartPanel title="Gender Statistics" items={analytics.genders} />
            <ChartPanel title="Monthly Added Records" items={analytics.months} />
          </section>
        ) : null}

        {['records', 'imports'].includes(activeSection) ? (
        <section className="workspace-panel" id="records">
          <div className="panel-title-row">
            <div>
              <h2>{activeSection === 'imports' ? 'Import / Export' : showingSheetEditor ? 'Sheet Editor' : 'Records'}</h2>
              <p>{activeSection === 'imports' ? `${validImportRows.length} import-ready rows` : showingSheetEditor ? `${validImportRows.length} import-ready rows` : `${selectedRows.length} selected on this page`}</p>
            </div>
            <div className="bulk-actions">
              <button className="secondary icon-button" onClick={() => exportRows(exportTargetRows(), 'personal-details-selected.xlsx')} disabled={!visibleRows.length}>
                <Download size={18} /> Excel
              </button>
              <button className="secondary icon-button" onClick={() => exportCsvRows(exportTargetRows())} disabled={!visibleRows.length}>
                <FileText size={18} /> CSV
              </button>
              <button className="secondary icon-button" onClick={() => printRows(exportTargetRows(), 'Personal Details Export')} disabled={!visibleRows.length}>
                <Printer size={18} /> PDF/Print
              </button>
              <button className="secondary icon-button danger-button" onClick={deleteSelectedRows} disabled={!selectedRows.length || showingSheetEditor}>
                <Trash2 size={18} /> Delete Selected
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".xlsx,.xls,.csv,.ods"
            onChange={handleImportFile}
          />

          <div className="controls">
            <label className="search-box">
              <Search size={18} />
              <input
                value={query.search}
                onChange={(event) => updateQuery({ search: event.target.value })}
                placeholder="Search name, email, phone, CNIC, address, organization..."
                disabled={showingSheetEditor}
              />
            </label>
            <select value={query.country} onChange={(event) => updateQuery({ country: event.target.value })} disabled={showingSheetEditor}>
              <option value="">All countries</option>
              {filters.countries.map((country) => <option key={country}>{country}</option>)}
            </select>
            <select value={query.city} onChange={(event) => updateQuery({ city: event.target.value })} disabled={showingSheetEditor}>
              <option value="">All cities</option>
              {filters.cities.map((city) => <option key={city}>{city}</option>)}
            </select>
            <select value={query.organization} onChange={(event) => updateQuery({ organization: event.target.value })} disabled={showingSheetEditor}>
              <option value="">All organizations</option>
              {filters.organizations.map((organization) => <option key={organization}>{organization}</option>)}
            </select>
            <select value={query.gender} onChange={(event) => updateQuery({ gender: event.target.value })} disabled={showingSheetEditor}>
              <option value="">All genders</option>
              <option>Male</option>
              <option>Female</option>
            </select>
            <input type="date" value={query.dateFrom} onChange={(event) => updateQuery({ dateFrom: event.target.value })} disabled={showingSheetEditor} title="Date added from" />
            <input type="date" value={query.dateTo} onChange={(event) => updateQuery({ dateTo: event.target.value })} disabled={showingSheetEditor} title="Date added to" />
          </div>

          <div className="action-row" id="imports">
            <button className="secondary icon-button" onClick={() => fileInputRef.current?.click()} disabled={importing || savingImport}>
              <Upload size={18} />
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button className="secondary icon-button" onClick={addImportedRow} disabled={savingImport}>
              <Plus size={18} />
              Add Row
            </button>
            {showingSheetEditor ? (
              <>
                <button className="export-button" onClick={saveImportedRows} disabled={savingImport || !validImportRows.length}>
                  <Save size={18} />
                  {savingImport ? 'Saving...' : 'Save Rows'}
                </button>
                <button className="secondary icon-button" onClick={clearImport} disabled={savingImport}>
                  <X size={18} />
                  Clear Import
                </button>
              </>
            ) : null}
            <div className="column-picker">
              <button className="secondary icon-button">
                <SlidersHorizontal size={18} /> Columns
              </button>
              <div className="column-menu">
                {columns.map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={columnState[key]}
                      onChange={() => setColumnState((current) => ({ ...current, [key]: !current[key] }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <button className="export-button" onClick={() => showingSheetEditor ? exportRows(importedRows, 'personal-details-import-edited.xlsx') : exportVisibleRows(rows)} disabled={!visibleRows.length}>
              <Download size={18} />
              Export to Excel
            </button>
          </div>

          {error ? <div className="table-message error">{error}</div> : null}
          {importMessage ? <div className="table-message success">{importMessage}</div> : null}

          <section className="table-wrap">
            <table>
              <colgroup>
                {!showingSheetEditor ? <col className="select-col-width" /> : null}
                <col className="person-col-width" />
                {visibleColumns.filter(([key]) => key !== 'name').map(([key]) => (
                  <col key={key} className={`${key}-col-width`} />
                ))}
                <col className="status-col-width" />
                <col className="actions-col-width" />
              </colgroup>
              <thead>
                <tr>
                  {!showingSheetEditor ? (
                    <th className="select-col">
                      <button className="th-button" onClick={toggleAllVisible} title="Select visible rows">
                        <CheckSquare size={16} />
                      </button>
                    </th>
                  ) : null}
                  <th>Person</th>
                  {visibleColumns.filter(([key]) => key !== 'name').map(([key, label]) => (
                    <th key={key}>
                      <button
                        className="th-button"
                        onClick={() => sortBy(key)}
                        disabled={showingSheetEditor || !sortableColumns.has(key)}
                      >
                        {label}
                        {!showingSheetEditor && sortableColumns.has(key) ? <ArrowDownUp size={14} /> : null}
                      </button>
                    </th>
                  ))}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!showingSheetEditor && loading ? (
                  <tr><td colSpan={visibleColumns.length + 3} className="table-message">Loading records...</td></tr>
                ) : visibleRows.length ? (
                  visibleRows.map((row, index) => (
                    <tr key={row.id ?? index} onDoubleClick={() => !showingSheetEditor && setActiveRecord(row)}>
                      {!showingSheetEditor ? (
                        <td className="select-col">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(String(row.id))}
                            onChange={() => toggleSelected(row.id)}
                            aria-label={`Select ${row.name || 'record'}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        {showingSheetEditor ? (
                          <input
                            className="cell-input"
                            value={row?.name || ''}
                            onChange={(event) => updateImportedCell(index, 'name', event.target.value)}
                          />
                        ) : String(editingRowId) === String(row.id) ? (
                          <input
                            className="cell-input"
                            value={editDraft.name || ''}
                            onChange={(event) => updateEditCell('name', event.target.value)}
                          />
                        ) : (
                          <PersonCell row={row} photo={profilePhotos[String(row.id)]} duplicate={duplicateMap[String(row.id)]} />
                        )}
                      </td>
                      {visibleColumns.filter(([key]) => key !== 'name').map(([key]) => (
                        <td key={key} className={`table-cell-${key}`}>
                          {showingSheetEditor ? (
                            <input
                              className="cell-input"
                              type={key === 'dateOfBirth' ? 'date' : 'text'}
                              value={row?.[key] || ''}
                              onChange={(event) => updateImportedCell(index, key, event.target.value)}
                            />
                          ) : String(editingRowId) === String(row.id) ? (
                            <input
                              className="cell-input"
                              type={key === 'dateOfBirth' ? 'date' : 'text'}
                              value={editDraft[key] || ''}
                              onChange={(event) => updateEditCell(key, event.target.value)}
                            />
                          ) : formatCell(row?.[key], key)}
                        </td>
                      ))}
                      <td>{!showingSheetEditor ? <StatusBadge row={row} /> : <span className="badge active">Draft</span>}</td>
                      <td>
                        {showingSheetEditor ? (
                          <div className="row-actions">
                            <button className="secondary icon-only" onClick={saveImportedRows} disabled={savingImport || !hasRequiredImportFields(row)} title="Save row">
                              <Save size={16} />
                            </button>
                            <button className="secondary icon-only" onClick={() => removeImportedRow(index)} disabled={savingImport} title="Remove row">
                              <X size={16} />
                            </button>
                          </div>
                        ) : String(editingRowId) === String(row.id) ? (
                          <div className="row-actions">
                            <button className="secondary icon-only" onClick={() => saveEditedRow(row.id)} disabled={savingRowId === row.id} title="Save row">
                              <Save size={16} />
                            </button>
                            <button className="secondary icon-only" onClick={cancelEditRow} disabled={savingRowId === row.id} title="Cancel edit">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="row-actions">
                            <button className="secondary icon-only" onClick={() => setActiveRecord(row)} disabled={deletingRowId === row.id} title="View row">
                              <Eye size={16} />
                            </button>
                            <button className="secondary icon-only" onClick={() => beginEditRow(row)} disabled={deletingRowId === row.id} title="Edit row">
                              <Edit size={16} />
                            </button>
                            <button className="secondary icon-only danger-button" onClick={() => deleteRow(row)} disabled={deletingRowId === row.id} title="Delete row">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : showingSheetEditor ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="table-message">
                      No rows in the sheet editor. Add a row or import a spreadsheet to begin.
                    </td>
                  </tr>
                ) : (
                  <tr><td colSpan={visibleColumns.length + 3} className="table-message">No records match the current view.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {!showingSheetEditor ? <footer className="pagination">
            <label>
              Rows
              <select value={query.limit} onChange={(event) => updateQuery({ limit: Number(event.target.value) })}>
                {[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
            <button className="secondary icon-button" disabled={pagination.page <= 1} onClick={() => updateQuery({ page: pagination.page - 1 })}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button className="secondary icon-button" disabled={pagination.page >= pagination.totalPages} onClick={() => updateQuery({ page: pagination.page + 1 })}>
              Next <ChevronRight size={16} />
            </button>
          </footer> : null}
        </section>
        ) : null}

        {activeSection === 'documents' ? (
        <section className="detail-grid single">
          <article className="workspace-panel summary-panel" id="documents">
            <div className="panel-title-row compact">
              <div>
                <h2>Documents</h2>
                <p>{attachedDocumentCount} files attached to records</p>
              </div>
              <FolderOpen size={20} />
            </div>
            <div className="summary-list">
              {rows.slice(0, 4).map((row) => (
                <button key={row.id} className="summary-row" onClick={() => setActiveRecord(row)}>
                  <span>{row.name || 'Unnamed record'}</span>
                  <strong>{(documents[String(row.id)] || []).length}</strong>
                </button>
              ))}
              {!rows.length ? <p>No records available.</p> : null}
            </div>
          </article>
        </section>
        ) : null}

        {activeSection === 'reports' ? (
        <section className="detail-grid single">
          <article className="workspace-panel summary-panel" id="reports">
            <div className="panel-title-row compact">
              <div>
                <h2>Reports</h2>
                <p>Export the current view or selected records</p>
              </div>
              <FileText size={20} />
            </div>
            <div className="quick-actions">
              <button className="secondary icon-button" onClick={() => exportCsvRows(exportTargetRows())} disabled={!visibleRows.length}>
                <FileText size={18} /> CSV
              </button>
              <button className="secondary icon-button" onClick={() => printRows(exportTargetRows(), 'Personal Details Export')} disabled={!visibleRows.length}>
                <Printer size={18} /> PDF/Print
              </button>
              <button className="export-button icon-button" onClick={() => exportRows(exportTargetRows(), 'personal-details-report.xlsx')} disabled={!visibleRows.length}>
                <Download size={18} /> Excel
              </button>
            </div>
          </article>
        </section>
        ) : null}

        {activeSection === 'settings' ? (
        <section className="detail-grid single">
          <article className="workspace-panel summary-panel" id="settings">
            <div className="panel-title-row compact">
              <div>
                <h2>Settings</h2>
                <p>Display preferences for this browser</p>
              </div>
              <Settings size={20} />
            </div>
            <div className="settings-list">
              <label>
                Dark mode
                <button className="secondary icon-button" onClick={() => setDarkMode((current) => !current)}>
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                  {darkMode ? 'Light' : 'Dark'}
                </button>
              </label>
              <label>
                Sidebar
                <button className="secondary icon-button" onClick={() => setSidebarCollapsed((current) => !current)}>
                  {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                  {sidebarCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </label>
            </div>
          </article>
        </section>
        ) : null}

        {activeSection === 'profile' ? (
        <section className="detail-grid single">
          <article className="workspace-panel summary-panel" id="profile">
            <div className="panel-title-row compact">
              <div>
                <h2>Profile</h2>
                <p>Signed in as {user?.username || 'Admin'}</p>
              </div>
              <span className="avatar small">{getInitials(user?.username || 'Admin')}</span>
            </div>
            <div className="profile-summary">
              <div>
                <span>Role</span>
                <strong>Admin</strong>
              </div>
              <div>
                <span>Session</span>
                <strong>Active</strong>
              </div>
              <button className="secondary icon-button danger-button" onClick={logout}>
                <LogOut size={18} /> Logout
              </button>
            </div>
          </article>
        </section>
        ) : null}
      </section>

      {activeRecord ? (
        <div className="modal-backdrop" onClick={() => setActiveRecord(null)}>
          <section className="record-modal" onClick={(event) => event.stopPropagation()} aria-label="Record details">
            <button className="modal-close secondary icon-only" onClick={() => setActiveRecord(null)} title="Close">
              <X size={18} />
            </button>
            <div className="record-hero">
              <Avatar row={activeRecord} photo={profilePhotos[String(activeRecord.id)]} />
              <div>
                <h2>{activeRecord.name}</h2>
                <p>{activeRecord.organization || 'No organization'}</p>
                <StatusBadge row={activeRecord} />
              </div>
            </div>
            <div className="modal-actions">
              <input ref={photoInputRef} className="file-input" type="file" accept="image/*" onChange={handlePhotoUpload} />
              <input ref={documentInputRef} className="file-input" type="file" onChange={handleDocumentUpload} />
              <button className="secondary icon-button" onClick={() => photoInputRef.current?.click()}><Upload size={16} /> Upload Photo</button>
              <button className="secondary icon-button" onClick={() => documentInputRef.current?.click()}><FolderOpen size={16} /> Attach File</button>
              <button className="secondary icon-button" onClick={() => printRows([activeRecord], `${activeRecord.name} Record`)}><Printer size={16} /> Download PDF</button>
              {activeRecordIsEditing ? (
                <>
                  <button className="export-button icon-button" onClick={() => saveEditedRow(activeRecord.id)} disabled={savingRowId === activeRecord.id}><Save size={16} /> Save</button>
                  <button className="secondary icon-button" onClick={cancelEditRow} disabled={savingRowId === activeRecord.id}><X size={16} /> Cancel</button>
                </>
              ) : (
                <button className="export-button icon-button" onClick={() => beginEditRow(activeRecord)}><Edit size={16} /> Edit</button>
              )}
              <button className="secondary icon-button danger-button" onClick={() => deleteRow(activeRecord)}><Trash2 size={16} /> Delete</button>
            </div>
            {activeRecordIsEditing ? (
              <div className="record-edit-form">
                {columns.map(([key, label]) => (
                  <label key={key} className={key === 'notes' || key === 'fullAddress' ? 'wide-field' : ''}>
                    <span>{label}</span>
                    {key === 'notes' || key === 'fullAddress' ? (
                      <textarea
                        value={editDraft[key] || ''}
                        onChange={(event) => updateEditCell(key, event.target.value)}
                        rows={key === 'notes' ? 3 : 2}
                      />
                    ) : (
                      <input
                        type={key === 'dateOfBirth' ? 'date' : 'text'}
                        value={editDraft[key] || ''}
                        onChange={(event) => updateEditCell(key, event.target.value)}
                      />
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="record-details">
                {columns.filter(([key]) => key !== 'notes').map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{formatCell(activeRecord[key], key) || 'Not set'}</strong>
                  </div>
                ))}
                <div>
                  <span>Map</span>
                  {activeRecord.fullAddress || activeRecord.city ? (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([activeRecord.fullAddress, activeRecord.city, activeRecord.country].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">
                      <MapPin size={15} /> View on Map
                    </a>
                  ) : <strong>Not available</strong>}
                </div>
              </div>
            )}
            <div className="modal-split">
              <section id="documents">
                <h3>Documents</h3>
                {(documents[String(activeRecord.id)] || []).length ? (
                  documents[String(activeRecord.id)].map((doc) => (
                    <div className="document-row" key={`${doc.name}-${doc.addedAt}`}>
                      <FileText size={16} />
                      <span>{doc.name}</span>
                      <small>{Math.ceil(doc.size / 1024)} KB</small>
                    </div>
                  ))
                ) : <p>No documents attached.</p>}
              </section>
              <section>
                <h3>History</h3>
                {(history[String(activeRecord.id)] || [`Created ${formatCell(activeRecord.createdAt, 'createdAt') || 'recently'}`]).map((item) => (
                  <div className="history-row" key={item}>{item}</div>
                ))}
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartPanel({ title, items }) {
  return (
    <section className="chart-panel">
      <h3>{title}</h3>
      {items.length ? items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div><i style={{ width: `${item.percent}%` }} /></div>
          <strong>{item.value}</strong>
        </div>
      )) : <p>No data yet.</p>}
    </section>
  );
}

function PersonCell({ row, photo, duplicate }) {
  return (
    <div className="person-cell">
      <Avatar row={row} photo={photo} />
      <div>
        <strong>{row.name || 'Unnamed'}</strong>
        <span>{row.email || 'No email'}</span>
        {duplicate ? <small className="duplicate-warning">Possible duplicate CNIC</small> : null}
      </div>
    </div>
  );
}

function Avatar({ row, photo }) {
  return photo
    ? <img className="avatar" src={photo} alt="" />
    : <span className="avatar">{getInitials(row?.name || 'Person')}</span>;
}

function StatusBadge({ row }) {
  const isVip = /vip|priority|important/i.test(row?.notes || '');
  const missingContact = !row?.email || !row?.phoneNumber;
  if (isVip) return <span className="badge vip">VIP</span>;
  if (missingContact) return <span className="badge warning">Needs Info</span>;
  return <span className="badge active">Active</span>;
}

function buildStats(rows, total) {
  const genders = rows.reduce((acc, row) => {
    const key = String(row.gender || '').toLowerCase();
    if (key.includes('male') && !key.includes('female')) acc.male += 1;
    if (key.includes('female')) acc.female += 1;
    return acc;
  }, { male: 0, female: 0 });
  return {
    total,
    male: genders.male,
    female: genders.female,
    countries: new Set(rows.map((row) => row.country).filter(Boolean)).size
  };
}

function buildAnalytics(rows) {
  return {
    countries: topDistribution(rows, 'country', 'Unknown'),
    genders: topDistribution(rows, 'gender', 'Unspecified'),
    months: topDistribution(rows.map((row) => ({ month: formatMonth(row.createdAt) })), 'month', 'No date')
  };
}

function topDistribution(rows, key, fallback) {
  const counts = rows.reduce((acc, row) => {
    const label = row[key] || fallback;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const max = Math.max(...Object.values(counts), 1);
  return Object.entries(counts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5)
    .map(([label, value]) => ({ label, value, percent: Math.max((value / max) * 100, 8) }));
}

function filterClientRows(rows, query) {
  return rows
    .filter((row) => !query.gender || String(row.gender || '').toLowerCase() === query.gender.toLowerCase())
    .filter((row) => !query.dateFrom || new Date(row.createdAt) >= new Date(query.dateFrom))
    .filter((row) => !query.dateTo || new Date(row.createdAt) <= new Date(query.dateTo));
}

function buildDuplicateMap(rows) {
  const cnicCounts = rows.reduce((acc, row) => {
    if (row.cnic) acc[row.cnic] = (acc[row.cnic] || 0) + 1;
    return acc;
  }, {});
  return Object.fromEntries(rows.map((row) => [String(row.id), row.cnic && cnicCounts[row.cnic] > 1]));
}

function buildNotifications(importMessage, selectedCount, rows) {
  const messages = [];
  if (importMessage) messages.push(importMessage);
  if (selectedCount) messages.push(`${selectedCount} records selected`);
  if (rows.some((row) => !row.email || !row.phoneNumber)) messages.push('Some records need contact details');
  return messages.length ? messages : ['Workspace is up to date'];
}

function formatCell(value, key) {
  if (!value) return '';
  if (['dateOfBirth', 'createdAt', 'updatedAt'].includes(key)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  }
  return value;
}

function formatMonth(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', year: 'numeric' });
}

function rowToDraft(row) {
  return Object.fromEntries(columns.map(([key]) => [key, row?.[key] || '']));
}

function hasRequiredImportFields(row) {
  return Boolean(row?.name?.trim() && row?.email?.trim() && row?.phoneNumber?.trim());
}

function getInitials(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';
}

function readLocalJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}
