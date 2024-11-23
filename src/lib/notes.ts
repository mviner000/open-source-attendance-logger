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

export interface Credentials {
  username: string;
  password: string;
}

export const NotesApi = {
  async getCredentials(): Promise<Credentials> {
    try {
      logger.log('Fetching credentials', 'info');
      const credentials = await invoke('get_credentials');
      return credentials as Credentials;
    } catch (error) {
      logger.log(`Failed to fetch credentials: ${error}`, 'error');
      throw error;
    }
  },

  async createNote(note: CreateNoteRequest, username: string, password: string): Promise<NoteWithDates> {
    try {
      logger.log(`Creating new note: ${note.title}`, 'info');
      const result = await invoke('create_note', { note, username, password });
      logger.log(`Successfully created note: ${note.title}`, 'success');
      return convertToDateNote(result as Note);
    } catch (error) {
      logger.log(`Failed to create note: ${error}`, 'error');
      throw error;
    }
  },

  async getAllNotes(): Promise<NoteWithDates[]> {
    try {
      logger.log('Fetching all notes', 'info');
      const notes = await invoke('get_all_notes');
      logger.log(`Successfully fetched ${(notes as Note[]).length} notes`, 'success');
      return (notes as Note[]).map(convertToDateNote);
    } catch (error) {
      logger.log(`Failed to fetch notes: ${error}`, 'error');
      throw error;
    }
  },

  async getNote(id: number): Promise<NoteWithDates> {
    try {
      logger.log(`Fetching note with id: ${id}`, 'info');
      const result = await invoke('get_note', { id });
      logger.log(`Successfully fetched note: ${(result as Note).title}`, 'success');
      return convertToDateNote(result as Note);
    } catch (error) {
      logger.log(`Failed to fetch note ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async updateNote(id: number, note: UpdateNoteRequest, username: string, password: string): Promise<NoteWithDates> {
    try {
      logger.log(`Updating note ${id}`, 'info');
      const result = await invoke('update_note', { id, note, username, password });
      logger.log(`Successfully updated note ${id}`, 'success');
      return convertToDateNote(result as Note);
    } catch (error) {
      logger.log(`Failed to update note ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async deleteNote(id: number, username: string, password: string): Promise<void> {
    try {
      logger.log(`Deleting note ${id}`, 'info');
      await invoke('delete_note', { id, username, password });
      logger.log(`Successfully deleted note ${id}`, 'success');
    } catch (error) {
      logger.log(`Failed to delete note ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async searchNotes(query: string): Promise<NoteWithDates[]> {
    try {
      logger.log(`Searching notes with query: ${query}`, 'info');
      const notes = await invoke('search_notes', { query });
      logger.log(`Found ${(notes as Note[]).length} notes matching "${query}"`, 'success');
      return (notes as Note[]).map(convertToDateNote);
    } catch (error) {
      logger.log(`Failed to search notes: ${error}`, 'error');
      throw error;
    }
  }
};