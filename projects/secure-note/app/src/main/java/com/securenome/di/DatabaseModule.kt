package com.securenome.di

import android.content.Context
import androidx.room.Room
import com.securenome.data.local.db.NoteDao
import com.securenome.data.local.db.NotebookDao
import com.securenome.data.local.db.SecureNoteDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for injecting the Room database and DAOs.
 *
 * ## Why a separate @Module?
 *
 * Hilt cannot create a RoomDatabase automatically — it needs a
 * @Provides function that tells it how to create the instance.
 * @Singleton ensures the whole app has only one database.
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SecureNoteDatabase {
        return Room.databaseBuilder(
            context,
            SecureNoteDatabase::class.java,
            "secure_note.db"
        )
            .addMigrations(
                SecureNoteDatabase.MIGRATION_1_2,
                SecureNoteDatabase.MIGRATION_2_3,
                SecureNoteDatabase.MIGRATION_3_4
            )
            .build()
    }

    @Provides
    @Singleton
    fun provideNoteDao(db: SecureNoteDatabase): NoteDao = db.noteDao()

    @Provides
    @Singleton
    fun provideNotebookDao(db: SecureNoteDatabase): NotebookDao = db.notebookDao()
}
