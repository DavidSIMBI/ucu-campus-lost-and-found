import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { api } from '../services/api.js';
import { validateReportPhoto } from '../services/reportPhoto.js';
import ReportManagementPage from '../components/reports/ReportManagementPage.jsx';
import ReportPageHeader from '../components/reports/ReportPageHeader.jsx';
import ReportPhotoField from '../components/reports/ReportPhotoField.jsx';

function getDateInputValue(value) {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match ? match[1] : '';
}

const emptyForm = {
  reportType: '',
  title: '',
  description: '',
  category: '',
  location: '',
  eventDate: '',
  identifyingDetails: '',
  photoPath: ''
};

export default function EditReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [existingPhotoFailed, setExistingPhotoFailed] = useState(false);
  const photoInput = useRef(null);

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedPhoto);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedPhoto]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError('');
      setForm(emptyForm);
      setSelectedPhoto(null);
      setPhotoError('');
      setRemovePhoto(false);
      setExistingPhotoFailed(false);

      try {
        const response = await api.get(`/reports/${id}/edit`, { signal: controller.signal });
        const report = response.data?.report;

        if (!report || typeof report !== 'object') {
          throw new Error('The report response was not in the expected format.');
        }

        setForm({
          reportType: String(report.report_type || '').toUpperCase(),
          title: report.title || '',
          description: report.description || '',
          category: report.category || '',
          location: report.location || '',
          eventDate: getDateInputValue(report.event_date),
          identifyingDetails: report.identifying_details || '',
          photoPath: report.photo_path || ''
        });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError.response?.data?.message ||
            requestError.message ||
            'Unable to load this report. Please try again.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReport();
    return () => controller.abort();
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handlePhotoChange(event) {
    const photo = event.target.files?.[0] || null;
    const validationMessage = validateReportPhoto(photo);
    setPhotoError(validationMessage);
    setSelectedPhoto(validationMessage ? null : photo);
    setError('');

    if (validationMessage) {
      event.target.value = '';
      return;
    }
    if (photo) setRemovePhoto(false);
  }

  function clearSelectedPhoto() {
    setSelectedPhoto(null);
    setPhotoError('');
    if (photoInput.current) photoInput.current.value = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || success) return;

    setError('');
    setPhotoError('');
    setSuccess('');
    setSaving(true);

    const reportData = new FormData();
    reportData.append('title', form.title);
    reportData.append('description', form.description);
    reportData.append('category', form.category);
    reportData.append('location', form.location);
    reportData.append('eventDate', form.eventDate);
    if (form.reportType === 'FOUND') {
      reportData.append('identifyingDetails', form.identifyingDetails);
    }
    if (selectedPhoto) reportData.append('photo', selectedPhoto);
    if (removePhoto) reportData.append('removePhoto', 'true');

    try {
      const response = await api.put(`/reports/${id}`, reportData);
      setSuccess(response.data?.message || 'Report updated successfully.');
      window.setTimeout(() => navigate('/my-reports'), 900);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to save your changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ReportManagementPage>
      <ReportPageHeader
        eyebrow="Manage your report"
        title="Edit report"
        description="Keep the listing accurate so the UCU community has the details needed to help."
      />

      {loading && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }} role="status">
          <CircularProgress size={28} sx={{ mb: 1.5 }} />
          <Typography color="text.secondary">Loading report details…</Typography>
        </Paper>
      )}

      {!loading && error && !form.title && (
        <Stack spacing={2}>
          <Alert severity="error" role="alert">{error}</Alert>
          <Button component={Link} to="/my-reports" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
            Back to My Reports
          </Button>
        </Stack>
      )}

      {!loading && Boolean(form.title) && (
        <Paper component="form" variant="outlined" onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: '#fff' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 2, sm: 2.5 } }}>
            <Paper
              variant="outlined"
              sx={{ gridColumn: '1 / -1', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, backgroundColor: '#edf3ee' }}
            >
              <Box>
                <Typography variant="body2" fontWeight={800}>Report type</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                  This cannot be changed after the report is created.
                </Typography>
              </Box>
              <Chip
                label={form.reportType === 'FOUND' ? 'FOUND ITEM' : 'LOST ITEM'}
                sx={form.reportType === 'FOUND'
                  ? { backgroundColor: '#e7f0e8', color: '#356344', fontWeight: 800 }
                  : { backgroundColor: '#f5eddb', color: '#806522', fontWeight: 800 }}
              />
            </Paper>

            <TextField
              name="title"
              label="Item name"
              value={form.title}
              onChange={handleChange}
              inputProps={{ maxLength: 140 }}
              required
              fullWidth
            />

            <TextField
              name="category"
              label="Category"
              value={form.category}
              onChange={handleChange}
              inputProps={{ maxLength: 60 }}
              required
              fullWidth
            />

            <TextField
              name="location"
              label="Location"
              value={form.location}
              onChange={handleChange}
              inputProps={{ maxLength: 160 }}
              required
              fullWidth
            />

            <TextField
              name="eventDate"
              label="Date lost or found"
              type="date"
              value={form.eventDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />

            <TextField
              name="description"
              label="Description"
              value={form.description}
              onChange={handleChange}
              inputProps={{ maxLength: 65535 }}
              multiline
              minRows={4}
              required
              fullWidth
              sx={{ gridColumn: '1 / -1' }}
            />

            {form.reportType === 'FOUND' && (
              <TextField
                name="identifyingDetails"
                label="Private identifying details"
                value={form.identifyingDetails}
                onChange={handleChange}
                inputProps={{ maxLength: 65535 }}
                multiline
                minRows={3}
                required
                fullWidth
                helperText="Only you can view these details. They are not included in public listings."
                sx={{ gridColumn: '1 / -1' }}
              />
            )}

            <ReportPhotoField
              id="editReportPhoto"
              selectedPhoto={selectedPhoto}
              previewUrl={photoPreview}
              photoError={photoError}
              currentPhotoPath={form.photoPath}
              removeCurrentPhoto={removePhoto}
              existingPhotoFailed={existingPhotoFailed}
              inputRef={photoInput}
              disabled={saving}
              onPhotoChange={handlePhotoChange}
              onRemoveSelected={clearSelectedPhoto}
              onRemoveCurrent={() => setRemovePhoto(true)}
              onKeepCurrent={() => setRemovePhoto(false)}
              onExistingPhotoError={() => setExistingPhotoFailed(true)}
            />

            {error && <Alert severity="error" role="alert" sx={{ gridColumn: '1 / -1' }}>{error}</Alert>}
            {success && <Alert severity="success" role="status" sx={{ gridColumn: '1 / -1' }}>{success}</Alert>}

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} sx={{ gridColumn: '1 / -1', pt: 0.5 }}>
              <Button type="button" variant="outlined" color="inherit" onClick={() => navigate('/my-reports')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" size="large" disabled={saving || Boolean(success)}>
                {saving ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Saving changes…</> : 'Save changes'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
    </ReportManagementPage>
  );
}
