import { describe, expect, it } from 'vitest';
import {
  buildPowerPointArguments,
  isRetryablePowerPointConversionFailure,
  selectPowerPointConverter,
} from './deck-conversion';

describe('selectPowerPointConverter', () => {
  it('uses Microsoft PowerPoint when LibreOffice is unavailable on Windows', () => {
    expect(selectPowerPointConverter({
      platform: 'win32',
      sofficePath: null,
      powerPointPath: 'C:/Program Files/Microsoft Office/root/Office16/POWERPNT.EXE',
    })).toBe('powerpoint');
  });

  it('prefers LibreOffice when both converters are available', () => {
    expect(selectPowerPointConverter({
      platform: 'win32',
      sofficePath: 'C:/Program Files/LibreOffice/program/soffice.exe',
      powerPointPath: 'C:/Program Files/Microsoft Office/root/Office16/POWERPNT.EXE',
    })).toBe('libreoffice');
  });
});

describe('buildPowerPointArguments', () => {
  it('passes PowerPoint input and output as separate PowerShell arguments', () => {
    const inputPath = 'C:/tmp/a;bad.pptx';
    const outputPath = 'C:/tmp/out.pdf';
    const arguments_ = buildPowerPointArguments(inputPath, outputPath);

    expect(arguments_.indexOf(inputPath)).toBe(arguments_.lastIndexOf(inputPath));
    expect(arguments_.indexOf(inputPath)).toBe(arguments_.indexOf('-InputPath') + 1);
    expect(arguments_[arguments_.indexOf('-OutputPath') + 1]).toBe(outputPath);
    expect(arguments_.filter((argument) => argument.includes(';bad'))).toEqual([inputPath]);
  });
});

describe('isRetryablePowerPointConversionFailure', () => {
  it('marks a converter rejection of a malformed deck as non-retryable', () => {
    expect(isRetryablePowerPointConversionFailure(
      new Error('Error: source file could not be loaded'),
    )).toBe(false);
    expect(isRetryablePowerPointConversionFailure(
      new Error('INVALID_DECK: PowerPoint could not open the presentation'),
    )).toBe(false);
    expect(isRetryablePowerPointConversionFailure({
      message: 'LibreOffice did not produce a PDF.',
      stdout: 'Error: source file could not be loaded',
    })).toBe(false);
  });

  it('keeps converter runtime and availability failures retryable', () => {
    expect(isRetryablePowerPointConversionFailure(
      new Error('spawn powershell.exe ENOENT'),
    )).toBe(true);
  });
});
