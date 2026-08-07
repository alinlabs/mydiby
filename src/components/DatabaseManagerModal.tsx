import React from 'react';
import { X, Plus, Trash2, Edit2, Copy, RotateCcw, FolderCheck, Check } from 'lucide-react';
import { DatabaseTable } from '../types';
import { generateId, createDefaultDatabase } from '../lib/storage';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  databases: DatabaseTable[];
  activeDbId: string;
  onSelectDatabase: (id: string) => void;
  onUpdateDatabases: (databases: DatabaseTable[], newActiveId?: string) => void;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  isOpen,
  onClose,
  databases,
  activeDbId,
  onSelectDatabase,
  onUpdateDatabases
}) => {
  const [newDbName, setNewDbName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  if (!isOpen) return null;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;

    const now = new Date().toISOString();
    const newDb: DatabaseTable = {
      id: generateId(),
      name: newDbName.trim(),
      description: 'Daftar perusahaan & kontak',
      records: [],
      createdAt: now,
      updatedAt: now
    };

    const updated = [...databases, newDb];
    onUpdateDatabases(updated, newDb.id);
    setNewDbName('');
  };

  const handleStartEdit = (db: DatabaseTable) => {
    setEditingId(db.id);
    setEditingName(db.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editingName.trim()) return;
    const updated = databases.map(db => {
      if (db.id === id) {
        return { ...db, name: editingName.trim(), updatedAt: new Date().toISOString() };
      }
      return db;
    });
    onUpdateDatabases(updated);
    setEditingId(null);
  };

  const handleDuplicate = (db: DatabaseTable) => {
    const now = new Date().toISOString();
    const copyDb: DatabaseTable = {
      id: generateId(),
      name: `${db.name} (Salinan)`,
      description: db.description,
      records: db.records.map(r => ({ ...r, id: generateId() })),
      createdAt: now,
      updatedAt: now
    };
    const updated = [...databases, copyDb];
    onUpdateDatabases(updated, copyDb.id);
  };

  const handleDelete = (id: string) => {
    if (databases.length <= 1) {
      alert('Tidak bisa menghapus database terakhir.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus database ini beserta seluruh isinya?')) return;

    const updated = databases.filter(db => db.id !== id);
    const nextActiveId = id === activeDbId ? updated[0].id : activeDbId;
    onUpdateDatabases(updated, nextActiveId);
  };

  const handleResetToSample = () => {
    if (!confirm('Reset akan menambahkan sampel data perusahaan Indonesia ke database aktif saat ini. Lanjutkan?')) return;
    const defaultDb = createDefaultDatabase();
    
    const updated = databases.map(db => {
      if (db.id === activeDbId) {
        return {
          ...db,
          records: defaultDb.records,
          updatedAt: new Date().toISOString()
        };
      }
      return db;
    });

    onUpdateDatabases(updated);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Kelola Project Database</h2>
              <p className="text-xs text-slate-500">Buat, ganti nama, duplikat, atau ganti database aktif</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Create New Db Form */}
          <form onSubmit={handleCreateNew} className="flex gap-2">
            <input
              type="text"
              placeholder="Nama Database Baru (e.g. Perusahaan Jawa Barat)..."
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              className="flex-1 bg-white border border-slate-200 text-xs text-slate-900 px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
            />
            <button
              type="submit"
              disabled={!newDbName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat</span>
            </button>
          </form>

          {/* Database List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daftar Database Tersimpan Lokal ({databases.length})
            </div>

            <div className="space-y-2">
              {databases.map((db) => {
                const isActive = db.id === activeDbId;
                const isEditing = db.id === editingId;

                return (
                  <div
                    key={db.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-emerald-50/50 border-emerald-300 text-slate-900 shadow-sm ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="bg-white border border-emerald-600 text-xs text-slate-900 px-2 py-1 rounded focus:outline-none flex-1 shadow-sm"
                          />
                          <button
                            onClick={() => handleSaveRename(db.id)}
                            className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs truncate text-emerald-900">{db.name}</span>
                            {isActive && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-bold border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {db.records.length} Perusahaan Terdata
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => {
                              onSelectDatabase(db.id);
                              onClose();
                            }}
                            className="text-xs bg-slate-100 hover:bg-emerald-700 text-slate-700 hover:text-white font-semibold px-2.5 py-1 rounded-lg transition-colors border border-slate-200"
                          >
                            Pilih
                          </button>
                        )}

                        <button
                          onClick={() => handleStartEdit(db)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Ganti Nama"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(db)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Duplikat Database"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(db.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                          title="Hapus Database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Quick Actions / Reset Demo */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleResetToSample}
              className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium hover:text-emerald-900 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Muat Ulang Contoh Data Perusahaan Indonesia</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-sm"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
