import { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { getReportPhotoUrl } from '../../services/reportPhoto.js';

const ACCEPTED_PHOTO_TYPES = '.jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp';

export default function ReportPhotoField({
  id,
  selectedPhoto,
  previewUrl,
  photoError,
  currentPhotoPath = '',
  removeCurrentPhoto = false,
  existingPhotoFailed = false,
  inputRef,
  disabled = false,
  onPhotoChange,
  onRemoveSelected,
  onRemoveCurrent,
  onKeepCurrent,
  onExistingPhotoError
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const existingPhotoUrl = getReportPhotoUrl(currentPhotoPath);

  useEffect(() => {
    setPreviewFailed(false);
  }, [selectedPhoto]);

  return (
    <Paper
      variant="outlined"
      sx={{
        gridColumn: '1 / -1',
        p: { xs: 1.5, sm: 2 },
        borderStyle: selectedPhoto || currentPhotoPath ? 'solid' : 'dashed',
        backgroundColor: '#fff'
      }}
    >
      <Stack spacing={1}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
            alignItems: { xs: 'start', sm: 'center' },
            columnGap: 2.5,
            rowGap: 1.5,
            minWidth: 0
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" variant="subtitle1" fontWeight={800}>
              Photo <Typography component="span" color="text.secondary" variant="body2" fontWeight={400}>(optional)</Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, overflowWrap: 'anywhere' }}>
              One JPEG, JPG, PNG or WebP image, up to 5 MB.
            </Typography>
          </Box>
          <Button
            component="label"
            variant="outlined"
            disabled={disabled}
            sx={{ flex: '0 0 auto', justifySelf: { xs: 'start', sm: 'end' }, minHeight: 44, minWidth: 145 }}
          >
            {selectedPhoto ? 'Choose another photo' : 'Choose photo'}
            <input
              ref={inputRef}
              id={id}
              hidden
              type="file"
              accept={ACCEPTED_PHOTO_TYPES}
              onChange={onPhotoChange}
              disabled={disabled}
              aria-label="Choose a report photo"
              aria-describedby={`${id}-help ${id}-error`}
            />
          </Button>
        </Box>

        <Typography id={`${id}-help`} variant="caption" color="text.secondary">
          Photos are re-encoded before storage. The original filename is not used.
        </Typography>

        {photoError && (
          <Alert id={`${id}-error`} severity="error" role="alert">
            {photoError}
          </Alert>
        )}

        {selectedPhoto && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px, 220px) minmax(0, 1fr)' },
              alignItems: 'center',
              gap: 1.5,
              p: 1.25,
              borderRadius: 2,
              backgroundColor: '#f4f7f3'
            }}
          >
            {previewUrl && !previewFailed ? (
              <Box
                component="img"
                src={previewUrl}
                alt="Preview of selected report photo"
                onError={() => setPreviewFailed(true)}
                sx={{ width: '100%', height: 120, objectFit: 'contain', borderRadius: 1, backgroundColor: '#fff' }}
              />
            ) : (
              <Typography role="status" color="text.secondary" sx={{ p: 2 }}>
                Photo preview unavailable.
              </Typography>
            )}
            <Stack spacing={1} alignItems="flex-start">
              <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                {selectedPhoto.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentPhotoPath
                  ? 'This will replace the current photo when you save.'
                  : 'This photo will be added when you save.'}
              </Typography>
              <Button color="inherit" size="small" onClick={onRemoveSelected} disabled={disabled}>
                Remove selected photo
              </Button>
            </Stack>
          </Box>
        )}

        {!selectedPhoto && currentPhotoPath && removeCurrentPhoto && (
          <Alert
            severity="warning"
            action={(
              <Button color="inherit" size="small" onClick={onKeepCurrent} disabled={disabled}>
                Keep current photo
              </Button>
            )}
          >
            The current photo will be removed when you save.
          </Alert>
        )}

        {!selectedPhoto && currentPhotoPath && !removeCurrentPhoto && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(160px, 220px) minmax(0, 1fr)' },
              alignItems: 'center',
              gap: 1.5,
              p: 1.25,
              borderRadius: 2,
              backgroundColor: '#f4f7f3'
            }}
          >
            {existingPhotoFailed || !existingPhotoUrl ? (
              <Alert severity="info">The current photo is unavailable.</Alert>
            ) : (
              <Box
                component="img"
                src={existingPhotoUrl}
                alt="Current report photo"
                onError={onExistingPhotoError}
                sx={{ width: '100%', height: 120, objectFit: 'contain', borderRadius: 1, backgroundColor: '#fff' }}
              />
            )}
            <Stack spacing={1} alignItems="flex-start">
              <Typography variant="body2" color="text.secondary">
                Leave the photo unchanged or choose a replacement.
              </Typography>
              <Button color="error" size="small" onClick={onRemoveCurrent} disabled={disabled}>
                Remove current photo
              </Button>
            </Stack>
          </Box>
        )}

        {!selectedPhoto && !currentPhotoPath && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
            No photo selected. You can still submit this report without one.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
