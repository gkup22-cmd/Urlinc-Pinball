import { Link } from "react-router-dom";
import { Play, Pencil, Trash2, Trophy } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "./ui/alert-dialog";
import { fileUrl } from "../lib/api";

export const TableCard = ({ table, onDelete, index = 0 }) => {
  const p = table.palette;
  const thumb = table.art?.backglass || table.art?.cabinet || table.art?.playfield;
  return (
    <article className="table-card group rise" style={{ animationDelay: `${index * 60}ms` }} data-testid={`table-card-${table.id}`}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
        {thumb ? (
          <img src={fileUrl(thumb)} alt={table.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `radial-gradient(circle at 30% 30%, ${p.primary}99, transparent 55%), radial-gradient(circle at 75% 70%, ${p.secondary}88, transparent 50%), ${p.bg}` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <h3 className="absolute bottom-3 left-4 right-4 font-display text-xl font-black uppercase leading-tight" style={{ textShadow: `0 0 18px ${p.primary}` }} data-testid="table-card-name">
          {table.name}
        </h3>
      </div>
      <div className="space-y-3 p-4">
        <p className="line-clamp-1 text-sm text-muted-foreground">{table.theme}</p>
        <div className="flex items-center justify-between font-mono text-xs text-white/70">
          <span className="flex items-center gap-1" data-testid="table-card-highscore"><Trophy className="h-3.5 w-3.5 text-[var(--amber)]" />{(table.high_score || 0).toLocaleString()}</span>
          <span>{table.plays || 0} plays</span>
        </div>
        <div className="flex gap-2">
          <Link to={`/play/${table.id}`} className="neon-btn h-10 flex-1 rounded-full text-sm" data-testid={`play-table-${table.id}`}>
            <Play className="h-4 w-4" /> Play
          </Link>
          <Link to={`/edit/${table.id}`} className="icon-btn" aria-label="Edit" data-testid={`edit-table-${table.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="icon-btn hover:!border-red-500 hover:!text-red-400" aria-label="Delete" data-testid={`delete-table-${table.id}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark border-white/10 bg-[var(--surface)] text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{table.name}"?</AlertDialogTitle>
                <AlertDialogDescription>This removes the table and its high score from your library. This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="delete-cancel-btn">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={() => onDelete(table)} data-testid="delete-confirm-btn">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
};
