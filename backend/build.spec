# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

block_cipher = None
BASE = Path('.').resolve()

a = Analysis(
    ['run.py'],
    pathex=[str(BASE)],
    binaries=[],
    datas=[
        ('app', 'app'),
        (str(BASE.parent / 'frontend' / 'dist'), 'frontend/dist'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.on',
        'fastapi',
        'sqlalchemy.dialects.sqlite',
        'rapidfuzz',
        'rapidfuzz.fuzz',
        'rapidfuzz.process',
        'jose',
        'jose.jwt',
        'passlib',
        'passlib.context',
        'passlib.handlers',
        'passlib.handlers.bcrypt',
        'bcrypt',
        'cryptography',
        'cryptography.fernet',
        'httpx',
        'pydantic',
        'email_validator',
        'PIL',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='sistema_licoreria',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    console=False,
)
