import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface NoteWithDates {
  id?: number;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}

function convertToDateNote(note: Note): NoteWithDates {
  return {
    ...note,
    created_at: new Date(Number(note.created_at) * 1000),
    updated_at: new Date(Number(note.updated_at) * 1000)
  };
}

export const NotesApi = {
    async createNote(note: CreateNoteRequest): Promise<NoteWithDates> {
      try {
        logger.log(`Creating new note: ${note.title}`, 'info');
        const result = await invoke<Note>('create_note', { note });
        logger.log(`Successfully created note: ${note.title}`, 'success');
        return convertToDateNote(result);
      } catch (error) {
        logger.log(`Failed to create note: ${error}`, 'error');
        throw error;
      }
    },
  
    async getAllNotes(): Promise<NoteWithDates[]> {
      try {
        logger.log('Fetching all notes', 'info');
        const notes = await invoke<Note[]>('get_all_notes');
        logger.log(`Successfully fetched ${notes.length} notes`, 'success');
        return notes.map(convertToDateNote);
      } catch (error) {
        logger.log(`Failed to fetch notes: ${error}`, 'error');
        throw error;
      }
    },
  
    async getNote(id: number): Promise<NoteWithDates> {
      try {
        logger.log(`Fetching note with id: ${id}`, 'info');
        const result = await invoke<Note>('get_note', { id });
        logger.log(`Successfully fetched note: ${result.title}`, 'success');
        return convertToDateNote(result);
      } catch (error) {
        logger.log(`Failed to fetch note ${id}: ${error}`, 'error');
        throw error;
      }
    },
  
    async updateNote(id: number, note: UpdateNoteRequest): Promise<NoteWithDates> {
      try {
        logger.log(`Updating note ${id}`, 'info');
        const result = await invoke<Note>('update_note', { id, note });
        logger.log(`Successfully updated note ${id}`, 'success');
        return convertToDateNote(result);
      } catch (error) {
        logger.log(`Failed to update note ${id}: ${error}`, 'error');
        throw error;
      }
    },
  
    async deleteNote(id: number): Promise<void> {
      try {
        logger.log(`Deleting note ${id}`, 'info');
        await invoke('delete_note', { id });
        logger.log(`Successfully deleted note ${id}`, 'success');
      } catch (error) {
        logger.log(`Failed to delete note ${id}: ${error}`, 'error');
        throw error;
      }
    },
  
    async searchNotes(query: string): Promise<NoteWithDates[]> {
      try {
        logger.log(`Searching notes with query: ${query}`, 'info');
        const notes = await invoke<Note[]>('search_notes', { query });
        logger.log(`Found ${notes.length} notes matching "${query}"`, 'success');
        return notes.map(convertToDateNote);
      } catch (error) {
        logger.log(`Failed to search notes: ${error}`, 'error');
        throw error;
      }
    }
  };