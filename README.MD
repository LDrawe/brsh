# Brsh (Terminal Emulator & Virtual File System)

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![CI Status](https://github.com/LDrawe/brsh/actions/workflows/ci.yml/badge.svg)

An educational Command Line Interface (CLI) emulator and Virtual File System (VFS) built entirely in TypeScript, featuring a fully localized Brazilian Portuguese (PT-BR) command suite. Designed to teach core operating system principles, it implements an in-memory nested inode tree, atomic memory-to-disk synchronization, and strict path sandboxing.

## Key Features

* PT-BR Native Interface: Fully localized command suite (e.g., `listar`, `carq`, `apagar`) built specifically for Brazilian Portuguese speakers and educational environments.
* Virtual File System (VFS): Operates on an in-memory nested tree structure (IVfsNode), mapping virtual paths to physical OS storage seamlessly.
* Virtual File System (VFS): Operates on an in-memory nested tree structure (IVfsNode), mapping virtual paths to physical OS storage seamlessly.
* Atomic I/O Operations: Implements atomic writing strategies (temp-to-rename) to prevent tree corruption during sudden process terminations.
* Kernel-Level Sandboxing: Strict directory traversal protection (chroot jail equivalent) ensures users cannot escape their designated /home environment.
* POSIX-Compliant Signaling: Graceful exit handling for SIGINT (Ctrl+C) and EOF (Ctrl+D), mimicking authentic Linux bash behavior.
* Zero-Overhead Runtime: Architected to run natively via Node.js, Bun, or Deno with minimal third-party dependencies.

## Architecture Overview

The codebase strictly separates the Kernel space (core logic) from the User space (CLI/presentation):

```text
src/
├── cli/          # User Space: Interface orchestration, command parsing, and REPL loop.
├── config/       # Database Layer: JSON-based VFS map and user credentials.
├── core/         # Kernel Space: Security, atomic I/O, VFS pointers, and authentication.
└── types/        # TypeScript Interfaces (IUser, IVfsNode, TerminalContext).
```
## Command Suite

brsh supports a comprehensive suite of directory and file management commands:

| Command | Syntax | Description |
| :--- | :--- | :--- |
| Directory | cdir <name> | Creates a new directory. |
| | rdir <name> | Removes an empty directory. |
| | listar / listarinv | Lists directory contents (alphabetical / reverse). |
| | listartudo | Recursively prints the directory tree. |
| | mudar <path> | Changes current working directory (cd). |
| | atual | Prints current working directory (pwd). |
| Files | carq <name> | Creates an empty file (touch). |
| | apagar <name> | Deletes a file or directory recursively (rm -rf). |
| | copiar <src> <dst>| Copies file/folder to destination. |
| | mover <src> <dst> | Moves file/folder to destination. |
| | buscar <name> [dir]| Deep search for a file in the VFS. |
| | renomear <old> <new>| Renames a file or directory. |
| System | alterarusr, deletarusr| Manage user sessions and accounts. |
| | clear, help, quit | Utilities and exit commands. |

## Getting Started

### Prerequisites
* Node.js v20+ or Bun installed.

### Installation

1. Clone the repository:
   git clone https://github.com/LDrawe/brsh.git
   cd brsh

2. Install dependencies:
   npm install

3. Boot the terminal:
   npm start

### Running Tests
The project is covered by a robust suite of unit and integration tests using the native node:test runner.
npm test

## License
This project is licensed under the MIT License - see the LICENSE file for details.