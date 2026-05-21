import { ArrowDownUp, Download, Edit, LogOut, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../state/AppContext.jsx';
import { exportRows, exportVisibleRows } from '../utils/exportExcel.js';
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

const sortableColumns = new Set(['name', 'email', 'phoneNumber', 'organization', 'country', 'city', 'cnic']);
const createEmptyImportRow = () => Object.fromEntries(importColumns.map(([key]) => [key, '']));

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
  const fileInputRef = useRef(null);
  const showingSheetEditor = editingSheet || importedRows.length > 0;
  const visibleRows = showingSheetEditor ? importedRows : rows;
  const visibleColumns = showingSheetEditor ? importColumns : columns;

  const params = useMemo(() => {
    const next = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    return next.toString();
  }, [query]);

  useEffect(() => {
    let ignore = false;

    async function loadRows() {
      setLoading(true);
      setError('');
      try {
        const result = await apiRequest(`/personal-details?${params}`, { token });
        if (!ignore) {
          setRows(Array.isArray(result.data) ? result.data.filter(Boolean) : []);
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
  }, [params, token, logout, refreshKey]);

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
      setPagination((current) => ({
        ...current,
        total: Math.max(current.total - 1, 0)
      }));
      if (String(editingRowId) === String(row.id)) cancelEditRow();
      setImportMessage('Row deleted.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingRowId(null);
    }
  }

  async function saveImportedRows() {
    setSavingImport(true);
    setError('');
    setImportMessage('');

    try {
      const result = await apiRequest('/personal-details/import', {
        token,
        method: 'POST',
        body: { rows: importedRows }
      });
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Personal Details Manager</h1>
          <p>{pagination.total} records available</p>
        </div>
        <div className="topbar-actions">
          <span>{user?.username}</span>
          <button className="secondary icon-button" onClick={logout} title="Logout">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <section className="controls">
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".xlsx,.xls,.csv,.ods"
          onChange={handleImportFile}
        />
        <label className="search-box">
          <Search size={18} />
          <input
            value={query.search}
            onChange={(event) => updateQuery({ search: event.target.value })}
            placeholder="Search name, email, phone, CNIC..."
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
        <button className="secondary icon-button" onClick={() => fileInputRef.current?.click()} disabled={importing || savingImport}>
          <Upload size={18} />
          {importing ? 'Importing...' : 'Import'}
        </button>
        <button className="secondary icon-button" onClick={addImportedRow} disabled={savingImport}>
          <Plus size={18} />
          Add row
        </button>
        {showingSheetEditor ? (
          <>
            <button className="export-button" onClick={saveImportedRows} disabled={savingImport || !importedRows.length}>
              <Save size={18} />
              {savingImport ? 'Saving...' : 'Save import'}
            </button>
            <button className="secondary icon-button" onClick={clearImport} disabled={savingImport}>
              <X size={18} />
              Clear import
            </button>
          </>
        ) : null}
        <button
          className="export-button"
          onClick={() => showingSheetEditor ? exportRows(importedRows, 'personal-details-import-edited.xlsx') : exportVisibleRows(rows)}
          disabled={!visibleRows.length}
        >
          <Download size={18} />
          Export to Excel
        </button>
      </section>

      {error ? <div className="table-message error">{error}</div> : null}
      {importMessage ? <div className="table-message success">{importMessage}</div> : null}

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              {visibleColumns.map(([key, label]) => (
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!showingSheetEditor && loading ? (
              <tr><td colSpan={visibleColumns.length + 1} className="table-message">Loading records...</td></tr>
            ) : visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr key={row.id ?? index}>
                  {visibleColumns.map(([key]) => (
                    <td key={key}>
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
                  <td>
                    {showingSheetEditor ? (
                      <button className="secondary icon-only" onClick={() => removeImportedRow(index)} title="Remove row">
                        <X size={16} />
                      </button>
                    ) : String(editingRowId) === String(row.id) ? (
                      <div className="row-actions">
                        <button
                          className="secondary icon-only"
                          onClick={() => saveEditedRow(row.id)}
                          disabled={savingRowId === row.id}
                          title="Save row"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          className="secondary icon-only"
                          onClick={cancelEditRow}
                          disabled={savingRowId === row.id}
                          title="Cancel edit"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button
                          className="secondary icon-only"
                          onClick={() => beginEditRow(row)}
                          disabled={deletingRowId === row.id}
                          title="Edit row"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="secondary icon-only danger-button"
                          onClick={() => deleteRow(row)}
                          disabled={deletingRowId === row.id}
                          title="Delete row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : showingSheetEditor ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="table-message">
                  No rows in the sheet editor. Add a row or import a spreadsheet to begin.
                </td>
              </tr>
            ) : (
              <tr><td colSpan={visibleColumns.length + 1} className="table-message">No records match the current view.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {!showingSheetEditor ? <footer className="pagination">
        <label>
          Rows
          <select
            value={query.limit}
            onChange={(event) => updateQuery({ limit: Number(event.target.value) })}
          >
            {[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
        <button
          className="secondary"
          disabled={pagination.page <= 1}
          onClick={() => updateQuery({ page: pagination.page - 1 })}
        >
          Previous
        </button>
        <button
          className="secondary"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => updateQuery({ page: pagination.page + 1 })}
        >
          Next
        </button>
      </footer> : null}
    </main>
  );
}

function formatCell(value, key) {
  if (!value) return '';
  if (key === 'dateOfBirth') return new Date(value).toLocaleDateString();
  return value;
}

function rowToDraft(row) {
  return Object.fromEntries(columns.map(([key]) => [key, row?.[key] || '']));
}
