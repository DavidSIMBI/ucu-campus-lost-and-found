import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { api } from '../services/api.js';
import { validateReportPhoto } from '../services/reportPhoto.js';
import ReportManagementPage from '../components/reports/ReportManagementPage.jsx';
import ReportPageHeader from '../components/reports/ReportPageHeader.jsx';
import ReportPhotoField from '../components/reports/ReportPhotoField.jsx';

const categories = ['Electronics', 'Accessories', 'Books', 'Clothing', 'Documents', 'Other'];
const standardFieldSx = {
  '& .MuiInputBase-root': { height: 54 },
  '& .MuiInputBase-input': { py: 0 }
};
const descriptionFieldSx = {
  gridColumn: '1 / -1',
  '& .MuiInputBase-root': { minHeight: 116, alignItems: 'flex-start' },
  '& .MuiInputBase-inputMultiline': { boxSizing: 'border-box', lineHeight: 1.5, py: 1.5 }
};

export default function ReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type')?.toUpperCase();
  const [form, setForm] = useState({
    reportType: requestedType === 'FOUND' ? 'FOUND' : 'LOST',
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    eventDate: '',
    identifyingDetails: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'reportType' && value === 'LOST' ? { identifyingDetails: '' } : {})
    }));
  }

  function handleReportTypeChange(_event, value) {
    if (!value) return;
    setForm((previous) => ({
      ...previous,
      reportType: value,
      ...(value === 'LOST' ? { identifyingDetails: '' } : {})
    }));
  }

  function handlePhotoChange(event) {
    const selectedPhoto = event.target.files?.[0] || null;
    const validationMessage = validateReportPhoto(selectedPhoto);
    setPhotoError(validationMessage);
    setPhoto(validationMessage ? null : selectedPhoto);
    setError('');

    if (validationMessage) event.target.value = '';
  }

  function removeSelectedPhoto() {
    setPhoto(null);
    setPhotoError('');
    if (photoInput.current) photoInput.current.value = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || success) return;

    setError('');
    setPhotoError('');
    setSuccess('');
    setLoading(true);

    try {
      const reportData = new FormData();
      reportData.append('reportType', form.reportType);
      reportData.append('title', form.title);
      reportData.append('description', form.description);
      reportData.append('category', form.category);
      reportData.append('location', form.location);
      reportData.append('eventDate', form.eventDate);

      if (form.reportType === 'FOUND') {
        reportData.append('identifyingDetails', form.identifyingDetails);
      }
      if (photo) reportData.append('photo', photo);

      const response = await api.post('/reports', reportData);
      setSuccess(response.data?.message || 'Report submitted successfully.');
      window.setTimeout(() => navigate('/items'), 1300);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to submit your report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ReportManagementPage contentMaxWidth={1080} compact>
      <ReportPageHeader
        eyebrow="Help reunite an item with its owner"
        title="Report an item"
        description="Share clear details about something lost or found in the UCU community."
        compact
      />

      <Paper
        component="form"
        variant="outlined"
        onSubmit={handleSubmit}
        sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, backgroundColor: '#fff' }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: { xs: 0, sm: 2.5 }, rowGap: { xs: 2, sm: 2.25 } }}>
          <FormControl required sx={{ gridColumn: '1 / -1' }}>
            <Typography component="label" variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              What happened?
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              value={form.reportType}
              onChange={handleReportTypeChange}
              aria-label="Choose whether you lost or found an item"
              sx={{
                '& .MuiToggleButton-root': {
                  py: 1.25,
                  textTransform: 'none',
                  fontWeight: 700,
                  borderColor: 'divider'
                },
                '& .Mui-selected': { backgroundColor: '#edf3ee !important' }
              }}
            >
              <ToggleButton value="LOST">I lost an item</ToggleButton>
              <ToggleButton value="FOUND">I found an item</ToggleButton>
            </ToggleButtonGroup>
            <FormHelperText sx={{ mx: 0 }}>Report type cannot be changed after submission.</FormHelperText>
          </FormControl>

          <TextField
            name="title"
            label="Item name"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Black Samsung phone"
            inputProps={{ maxLength: 140 }}
            required
            fullWidth
            sx={standardFieldSx}
          />

          <TextField
            select
            name="category"
            label="Category"
            value={form.category}
            onChange={handleChange}
            required
            fullWidth
            sx={standardFieldSx}
          >
            {categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
          </TextField>

          <TextField
            name="location"
            label="Location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Main Library"
            inputProps={{ maxLength: 160 }}
            required
            fullWidth
            sx={standardFieldSx}
          />

          <TextField
            name="eventDate"
            label="Date lost or found"
            type="date"
            value={form.eventDate}
            onChange={handleChange}
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
            sx={standardFieldSx}
          />

          <TextField
            name="description"
            label="Description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the item and any details that may help identify it."
            inputProps={{ maxLength: 65535 }}
            multiline
            minRows={3}
            required
            fullWidth
            sx={descriptionFieldSx}
          />

          {form.reportType === 'FOUND' && (
            <TextField
              name="identifyingDetails"
              label="Private identifying details"
              value={form.identifyingDetails}
              onChange={handleChange}
              placeholder="Enter a detail only the real owner is likely to know. It will not appear in public listings."
              inputProps={{ maxLength: 65535 }}
              multiline
              minRows={3}
              required
              fullWidth
              helperText="Keep a recognition detail private to help verify an ownership claim."
              sx={{ ...descriptionFieldSx, '& .MuiInputBase-root': { minHeight: 96, alignItems: 'flex-start' } }}
            />
          )}

          <ReportPhotoField
            id="reportPhoto"
            selectedPhoto={photo}
            previewUrl={photoPreview}
            photoError={photoError}
            inputRef={photoInput}
            disabled={loading}
            onPhotoChange={handlePhotoChange}
            onRemoveSelected={removeSelectedPhoto}
          />

          {error && <Alert severity="error" role="alert" sx={{ gridColumn: '1 / -1' }}>{error}</Alert>}
          {success && <Alert severity="success" role="status" sx={{ gridColumn: '1 / -1' }}>{success}</Alert>}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            gap={{ xs: 1.5, sm: 3 }}
            sx={{
              gridColumn: '1 / -1',
              mt: 0,
              pt: 1.75,
              borderTop: '1px solid',
              borderColor: 'divider',
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: { xs: 'flex-start', sm: 'space-between' }
            }}
          >
            <Button type="submit" variant="contained" size="large" disabled={loading || Boolean(success)} sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 168 }, minHeight: 48, order: { xs: 1, sm: 2 } }}>
              {loading ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Submitting report…</> : 'Submit report'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, lineHeight: 1.6, order: { xs: 2, sm: 1 } }}>
              Fields marked as required must be completed before you submit.
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </ReportManagementPage>
  );
}
