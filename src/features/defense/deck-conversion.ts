import path from 'path';

export type PowerPointConverter = 'libreoffice' | 'powerpoint';

const powerShellScriptPath = path.join(
  process.cwd(),
  'scripts',
  'convert-presentation.ps1',
);

export function selectPowerPointConverter(input: {
  platform: NodeJS.Platform;
  sofficePath: string | null;
  powerPointPath: string | null;
}): PowerPointConverter | null {
  if (input.sofficePath) {
    return 'libreoffice';
  }

  if (input.platform === 'win32' && input.powerPointPath) {
    return 'powerpoint';
  }

  return null;
}

export function buildPowerPointArguments(
  inputPath: string,
  outputPath: string,
): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    powerShellScriptPath,
    '-InputPath',
    inputPath,
    '-OutputPath',
    outputPath,
  ];
}

export function isRetryablePowerPointConversionFailure(error: unknown): boolean {
  const processError = error as { message?: unknown; stdout?: unknown; stderr?: unknown };
  const details = [processError?.message, processError?.stdout, processError?.stderr]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return ![
    'invalid_deck:',
    'source file could not be loaded',
    'file is corrupt',
    'not a valid powerpoint',
    'presentation cannot be opened',
  ].some((message) => details.includes(message));
}
