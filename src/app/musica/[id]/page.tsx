'use client';

import { use, useState } from 'react';
import { mockSongs, getDefaultVersion, liturgicalTagLabels } from '@/data/mock-songs';
import ChordBlockView, { ChordToolbar } from '@/components/ChordBlockView';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { ViewMode, FontSizePreset, SongVersion } from '@/types';
import {
  ArrowLeft,
  ExternalLink,
  Tag,
  Users,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PlayCircle,
  Music2,
  MonitorSmartphone,
} from 'lucide-react';
import Link from 'next/link';

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const song = mockSongs.find((s) => s.id === id);

  const [viewMode, setViewMode] = useState<ViewMode>('chords_and_lyrics');
  const [fontSize, setFontSize] = useState<FontSizePreset>('md');
  const [transposeSemitones, setTransposeSemitones] = useState(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  if (!song) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Music2 className="w-12 h-12 text-subtle mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Música não encontrada</h2>
          <Link href="/" className="text-sm text-accent hover:underline mt-2 block cursor-pointer">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const defaultVersion = getDefaultVersion(song);
  const activeVersion = selectedVersionId
    ? song.versions.find((v) => v.id === selectedVersionId) || defaultVersion
    : defaultVersion;

  if (!activeVersion) return null;

  const analysis = song.analysis;
  const approvalStatus = analysis?.status || 'pending';

  return (
    <div className="min-h-screen pb-20">
      {/* Back Nav */}
      <div className="px-4 py-3 no-print">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      {/* Song Meta Header */}
      <div className="px-5 md:px-8 mb-4 no-print">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center shrink-0
            ${song.nature === 'hino' ? 'bg-info/10' : 'bg-accent-subtle'}
          `}>
            <Music2 className={`w-7 h-7 ${song.nature === 'hino' ? 'text-info' : 'text-accent'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              {song.title}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted">
                <Users className="w-3 h-3" />
                {activeVersion.artists.join(', ')}
              </span>
              {song.originalComposer && (
                <span className="text-[10px] text-subtle">
                  Compositor: {song.originalComposer}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                song.nature === 'hino' ? 'bg-info/10 text-info' : 'bg-accent-subtle text-accent'
              }`}>
                {song.nature === 'hino' ? 'Hino' : 'Louvor'}
              </span>
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
        </div>

        {/* Analysis Badge (clickable) */}
        {analysis && (
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`
              mt-3 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border cursor-pointer
              transition-all duration-200
              ${approvalStatus === 'approved'
                ? 'border-success/20 bg-success/5 hover:bg-success/10'
                : approvalStatus === 'rejected'
                  ? 'border-danger/20 bg-danger/5 hover:bg-danger/10'
                  : 'border-warning/20 bg-warning/5 hover:bg-warning/10'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {approvalStatus === 'approved' ? (
                <ShieldCheck className="w-4 h-4 text-success" />
              ) : approvalStatus === 'rejected' ? (
                <ShieldAlert className="w-4 h-4 text-danger" />
              ) : (
                <ShieldQuestion className="w-4 h-4 text-warning" />
              )}
              <span className={`text-xs font-semibold ${
                approvalStatus === 'approved' ? 'text-success' :
                approvalStatus === 'rejected' ? 'text-danger' : 'text-warning'
              }`}>
                Análise Teológica: {approvalStatus === 'approved' ? 'Aprovado' :
                  approvalStatus === 'rejected' ? 'Rejeitado' : 'Pendente'}
              </span>
            </div>
            {showAnalysis ? (
              <ChevronUp className="w-4 h-4 text-subtle" />
            ) : (
              <ChevronDown className="w-4 h-4 text-subtle" />
            )}
          </button>
        )}

        {/* Analysis Expanded */}
        {showAnalysis && analysis && analysis.justification && (
          <div className="mt-2 px-4 py-3 bg-elevated rounded-xl border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-foreground">Parecer Pastoral</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {analysis.justification}
            </p>
            {analysis.scriptureReferences && analysis.scriptureReferences.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-subtle">Referências:</span>
                {analysis.scriptureReferences.map((ref) => (
                  <span key={ref} className="text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded-md">
                    {ref}
                  </span>
                ))}
              </div>
            )}
            {analysis.analyzedBy && (
              <p className="text-[10px] text-subtle mt-2">
                Analisado por: {analysis.analyzedBy}
                {analysis.analyzedAt && ` em ${new Date(analysis.analyzedAt).toLocaleDateString('pt-BR')}`}
              </p>
            )}
          </div>
        )}

        {/* Version Selector */}
        {song.versions.length > 1 && (
          <div className="mt-3">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-2 text-xs text-accent font-medium cursor-pointer hover:underline"
            >
              {showVersions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {song.versions.length} versões disponíveis
            </button>
            {showVersions && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                {song.versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVersionId(v.id);
                      setTransposeSemitones(0);
                      setShowVersions(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer
                      transition-all duration-200
                      ${v.id === activeVersion.id
                        ? 'bg-accent-subtle border border-accent/30 text-accent'
                        : 'bg-elevated hover:bg-border text-muted'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{v.artists.join(', ')}</span>
                      {v.isDefault && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-1.5 py-0.5 rounded">
                          padrão
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{v.key}</span>
                      <span className="text-xs text-subtle">{v.bpm} BPM</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* YouTube Link */}
        {activeVersion.youtubeUrl && (
          <a
            href={activeVersion.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            Assistir no YouTube
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {/* Wake Lock Toggle */}
        {wakeLockSupported && (
          <button
            onClick={toggleWakeLock}
            className={`
              mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-all cursor-pointer ml-2
              ${wakeLockActive
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'bg-elevated text-muted hover:bg-border'
              }
            `}
          >
            <MonitorSmartphone className="w-4 h-4" />
            {wakeLockActive ? 'Tela Ligada ✓' : 'Manter Tela Ligada'}
          </button>
        )}
      </div>

      {/* Chord Display Area */}
      <ChordToolbar
        songTitle={song.title}
        currentKey={activeVersion.key}
        bpm={activeVersion.bpm}
        viewMode={viewMode}
        fontSize={fontSize}
        transposeSemitones={transposeSemitones}
        onViewModeChange={setViewMode}
        onFontSizeChange={setFontSize}
        onTransposeChange={setTransposeSemitones}
      />

      {/* Blocks */}
      <div className="px-5 md:px-8 py-4">
        {activeVersion.blocks.map((block) => (
          <ChordBlockView
            key={block.id}
            block={block}
            viewMode={viewMode}
            fontSize={fontSize}
            transposeSemitones={transposeSemitones}
          />
        ))}
      </div>
    </div>
  );
}
