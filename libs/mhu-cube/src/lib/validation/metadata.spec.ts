import { codes } from '../../testing/validation-fixtures';
import { isSafeMetadataHref, validateCompactMetadata, validateHoverMetadata } from './metadata';

describe('metadata validation', () => {
  it('isSafeMetadataHref allows web destinations and rejects executable schemes', () => {
    expect(isSafeMetadataHref('#local-metadata')).toBe(true);
    expect(isSafeMetadataHref('../metadata/dataset')).toBe(true);
    expect(isSafeMetadataHref('https://example.org/metadata')).toBe(true);
    expect(isSafeMetadataHref('javascript:alert(1)')).toBe(false);
    expect(isSafeMetadataHref('data:text/html,test')).toBe(false);
    expect(isSafeMetadataHref('http://'), 'Unparseable URLs are unsafe.').toBe(false);
  });

  it('validateCompactMetadata keeps trimmed unique names and falls back to every entry', () => {
    expect(validateCompactMetadata(undefined)).toEqual({ value: null, issues: [] });
    expect(validateCompactMetadata([' Corresponding authors ', 'Sex', 'Sex', ''])).toEqual({
      value: ['Corresponding authors', 'Sex'],
      issues: [],
    });
    const invalid = validateCompactMetadata(['Sex', 4]);
    expect(invalid.value).toBe(null);
    expect(codes(invalid)).toEqual(['compact-metadata.invalid']);
    expect(invalid.issues[0].severity).toBe('warning');
  });

  it('validateHoverMetadata keeps trimmed unique names and falls back to every entry', () => {
    expect(validateHoverMetadata(null)).toEqual({ value: null, issues: [] });
    expect(validateHoverMetadata([' Time ', 'Sex'])).toEqual({ value: ['Time', 'Sex'], issues: [] });
    const invalid = validateHoverMetadata('Sex');
    expect(invalid.value).toBe(null);
    expect(codes(invalid)).toEqual(['hover-metadata.invalid']);
  });
});
