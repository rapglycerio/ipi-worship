'use client';

import type { MasterSong, ApprovalStatus } from '@/types';
import { getDefaultVersion, liturgicalTagLabels } from '@/data/mock-songs';
import Link from 'next/link';
import {
  Music2,
  Clock,
  Tag,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Users,
} from 'lucide-react';

interface SongCardProps {
  song: MasterSong;
  compact?: boolean;
  index?: number;
}

const approvalConfig: Record<ApprovalStatus, { badge: string; icon: typeof ShieldCheck; label: string }> = {
  approved: { badge: 'badge-approved', icon: ShieldCheck, label: 'Aprovado' },
  rejected: { badge: 'badge-rejected', icon: ShieldAlert, label: 'Rejeitado' },
  pending: { badge: 'badge-pending', icon: ShieldQuestion, label: 'Pendente' },
};

export default function SongCard({ song, compact = false, index }: SongCardProps) {
  const defaultVersion = getDefaultVersion(song);
  if (!defaultVersion) return null;

  const approval = song.analysis
    ? approvalConfig[song.analysis.status]
    : approvalConfig.pending;
  const ApprovalIcon = approval.icon;

  return (
    <Link
      href={`/musica/${song.id}`}
      className={`
        group block bg-card border border-border rounded-xl overflow-hidden
        hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5
        transition-all duration-200 cursor-pointer
        ${compact ? 'p-3' : 'p-4'}
      `}
      style={index !== undefined ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Song Number / Icon */}
        <div className={`
          shrink-0 rounded-lg flex items-center justify-center
          ${compact ? 'w-10 h-10' : 'w-12 h-12'}
          ${song.nature === 'hino' ? 'bg-info/10' : 'bg-accent-subtle'}
        `}>
          {index !== undefined ? (
            <span className={`font-bold ${compact ? 'text-sm' : 'text-lg'} ${song.nature === 'hino' ? 'text-info' : 'text-accent'}`}>
              {index + 1}
            </span>
          ) : (
            <Music2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${song.nature === 'hino' ? 'text-info' : 'text-accent'}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-semibold text-foreground truncate group-hover:text-accent transition-colors ${compact ? 'text-sm' : 'text-base'}`}>
                {song.title}
              </h3>
              {/* Artists */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Users className="w-3 h-3 text-subtle shrink-0" />
                <p className="text-xs text-muted truncate">
                  {defaultVersion.artists.join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Approval Badge */}
              <span className={approval.badge}>
                <ApprovalIcon className="w-3 h-3" />
                {!compact && approval.label}
              </span>
              <ChevronRight className="w-4 h-4 text-subtle group-hover:text-accent transition-colors" />
            </div>
          </div>

          {/* Metadata Row */}
          {!compact && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* Key & BPM */}
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent bg-accent-subtle px-2 py-0.5 rounded-md">
                {defaultVersion.key}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <Clock className="w-3 h-3" />
                {defaultVersion.bpm} BPM
              </span>

              {/* Nature */}
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                song.nature === 'hino'
                  ? 'bg-info/10 text-info'
                  : 'bg-accent-subtle text-accent'
              }`}>
                {song.nature === 'hino' ? 'Hino' : 'Louvor'}
              </span>

              {/* Liturgical Tags */}
              {song.liturgicalTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] text-subtle bg-elevated px-2 py-0.5 rounded-md"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {liturgicalTagLabels[tag]}
                </span>
              ))}

              {/* Version count */}
              {song.versions.length > 1 && (
                <span className="text-[10px] text-subtle">
                  +{song.versions.length - 1} versão(ões)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
