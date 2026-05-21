import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  deletePersonalDetail,
  getPersonalDetails,
  importPersonalDetails,
  updatePersonalDetail
} from '../services/personalDetails.service.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await getPersonalDetails(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const result = await importPersonalDetails(req.body?.rows);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await updatePersonalDetail(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await deletePersonalDetail(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
