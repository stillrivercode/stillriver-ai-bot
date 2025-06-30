#!/usr/bin/env python3
"""
Security utilities for safe subprocess execution.
This module provides secure wrappers for common subprocess operations.
"""

import shutil
import subprocess  # nosec B404 - This is a security utility module providing secure subprocess wrappers
from pathlib import Path


class SecureSubprocess:
    """Secure subprocess execution with validation."""

    # Allowed commands for execution
    ALLOWED_COMMANDS = {
        "git",
        "python",
        "python3",
        "pip",
        "pip3",
        "pytest",
        "bandit",
        "black",
        "ruff",
        "mypy",
    }

    @staticmethod
    def find_executable(command: str) -> str | None:
        """Find the full path to an executable command."""
        if command not in SecureSubprocess.ALLOWED_COMMANDS:
            raise ValueError(f"Command '{command}' is not in the allowed list")

        # Use shutil.which to find the full path
        full_path = shutil.which(command)
        if not full_path:
            raise FileNotFoundError(f"Command '{command}' not found in PATH")

        return full_path

    @staticmethod
    def run(
        command: list[str],
        cwd: str | Path | None = None,
        check: bool = True,
        capture_output: bool = False,
        text: bool = True,
        **kwargs,
    ) -> subprocess.CompletedProcess:
        """
        Securely run a subprocess command.

        Args:
            command: Command and arguments as a list
            cwd: Working directory for the command
            check: Whether to check return code
            capture_output: Whether to capture stdout/stderr
            text: Whether to decode output as text
            **kwargs: Additional arguments for subprocess.run

        Returns:
            CompletedProcess instance
        """
        if not command:
            raise ValueError("Command list cannot be empty")

        # Get the executable name
        executable = command[0]

        # Find the full path to the executable
        full_path = SecureSubprocess.find_executable(executable)

        # Replace the command with the full path
        secure_command = [full_path] + command[1:]

        # Validate cwd if provided
        if cwd:
            cwd_path = Path(cwd).resolve()
            if not cwd_path.exists():
                raise FileNotFoundError(f"Working directory '{cwd}' does not exist")
            if not cwd_path.is_dir():
                raise NotADirectoryError(f"'{cwd}' is not a directory")

        # Run the command securely
        return subprocess.run(  # nosec B603 - Command validation and full path resolution ensures security
            secure_command,
            cwd=cwd,
            check=check,
            capture_output=capture_output,
            text=text,
            shell=False,  # Explicitly set shell=False for security
            **kwargs,
        )


def validate_file_path(path: str | Path, must_exist: bool = True) -> Path:
    """
    Validate a file path for security.

    Args:
        path: Path to validate
        must_exist: Whether the path must exist

    Returns:
        Resolved Path object
    """
    resolved_path = Path(path).resolve()

    # Check for path traversal attempts
    try:
        # Ensure the path doesn't escape the current working directory
        resolved_path.relative_to(Path.cwd())
    except ValueError:
        # Allow absolute paths within the project
        project_root = Path(__file__).parent.parent
        try:
            resolved_path.relative_to(project_root)
        except ValueError as e:
            raise ValueError(f"Path '{path}' is outside the project directory") from e

    if must_exist and not resolved_path.exists():
        raise FileNotFoundError(f"Path '{path}' does not exist")

    return resolved_path


def safe_file_write(path: str | Path, content: str, mode: str = "w") -> None:
    """
    Safely write content to a file.

    Args:
        path: File path to write to
        content: Content to write
        mode: File open mode
    """
    # Validate the path
    file_path = validate_file_path(path, must_exist=False)

    # Ensure parent directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Write the file
    with open(file_path, mode, encoding="utf-8") as f:
        f.write(content)


def safe_file_read(path: str | Path) -> str:
    """
    Safely read content from a file.

    Args:
        path: File path to read from

    Returns:
        File content as string
    """
    # Validate the path
    file_path = validate_file_path(path, must_exist=True)

    # Read the file
    with open(file_path, encoding="utf-8") as f:
        return f.read()
