'use client';

import { useState } from 'react';
import { mockSongs, liturgicalTagLabels } from '@/data/mock-songs';
import type { ApprovalStatus, MasterSong } from '@/types';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ClipboardCheck,
  Filter,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Music2,
  Users,
  Tag,
  ExternalLink,
} from 'lucide-react';

const statusConfig: Record<ApprovalStatus, { icon: typeof ShieldCheck; color: string; bg: string; border: string; label: string }> = {
  approved: { icon: ShieldCheck, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20', label: 'Aprovado' },
  rejected: { icon: ShieldAlert, color: 'text-danger', bg: 'bg-danger/5', border: 'border-danger/20', label: 'Rejeitado' },
  pending: { icon: ShieldQuestion, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20', label: 'Pendente' },
};

export default function AnalisesPage() {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSongs = mockSongs.filter((s) => {
    if (filterStatus === 'all') return true;
    return s.analysis?.status === filterStatus;
  });

  const counts = {
    approved: mockSongs.filter((s) => s.analysis?.status === 'approved').length,
    pending: mockSongs.filter((s) => s.analysis?.status === 'pending').length,
    rejected: mockSongs.filter((s) => s.analysis?.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Análises de Louvor
            </h1>
            <p className="text-xs text-muted">Governança teológica do repertório</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-success/5 border border-success/20 rounded-xl p-3 text-center">
            <ShieldCheck className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-success">{counts.approved}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-success/70">Aprovados</p>
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 text-center">
            <ShieldQuestion className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-warning">{counts.pending}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warning/70">Pendentes</p>
          </div>
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-3 text-center">
            <ShieldAlert className="w-5 h-5 text-danger mx-auto mb-1" />
            <p className="text-lg font-bold text-danger">{counts.rejected}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-danger/70">Rejeitados</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-subtle" />
          {(['all', 'approved', 'pending', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all
                ${filterStatus === status
                  ? 'bg-accent text-white'
                  : 'bg-elevated text-muted hover:bg-border'
                }
              `}
            >
              {status === 'all' ? 'Todos' : statusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Cards */}
      <div className="px-5 md:px-8 pb-12 space-y-3">
        {filteredSongs.map((song, i) => (
          <AnalysisCard
            key={song.id}
            song={song}
            isExpanded={expandedId === song.id}
            onToggle={() => setExpandedId(expandedId === song.id ? null : song.id)}
            index={i}
          />
        ))}

        {filteredSongs.length === 0 && (
          <div className="text-center py-12">
            <ClipboardCheck className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="text-sm text-muted">Nenhuma análise neste filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisCard({
  song,
  isExpanded,
  onToggle,
  index,
}: {
  song: MasterSong;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const analysis = song.analysis;
  const status = analysis?.status || 'pending';
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-xl overflow-hidden transition-all duration-200 animate-slide-up`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header (clickable) */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon className={`w-5 h-5 ${config.color} shrink-0`} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{song.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                song.nature === 'hino' ? 'bg-info/10 text-info' : 'bg-accent-subtle text-accent'
              }`}>
                {song.nature === 'hino' ? 'Hino' : 'Louvor'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/musica/${song.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-accent hover:underline"
          >
            Ver cifra →
          </Link>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-subtle" />
          ) : (
            <ChevronDown className="w-4 h-4 text-subtle" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="bg-elevated rounded-lg p-3 border border-border">
            {analysis?.justification ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-foreground">Parecer Pastoral</span>
                </div>
                <p className="text-sm text-muted leading-relaxed">{analysis.justification}</p>

                {analysis.scriptureReferences && analysis.scriptureReferences.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-subtle">Referências:</span>
                    {analysis.scriptureReferences.map((ref) => (
                      <span
                        key={ref}
                        className="text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded-md"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
                {analysis.analyzedBy && (
                  <p className="text-[10px] text-subtle mt-2">
                    Analisado por: {analysis.analyzedBy}
                    {analysis.analyzedAt &&
                      ` em ${new Date(analysis.analyzedAt).toLocaleDateString('pt-BR')}`}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <ShieldQuestion className="w-8 h-8 text-warning/50 mx-auto mb-2" />
                <p className="text-xs text-muted">Análise ainda não realizada.</p>
                <p className="text-[10px] text-subtle mt-1">
                  Este louvor precisa ser avaliado por um pastor ou líder teológico.
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {song.liturgicalTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] text-subtle bg-elevated px-2 py-0.5 rounded-md"
              >
                <Tag className="w-2.5 h-2.5" />
                {liturgicalTagLabels[tag]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
