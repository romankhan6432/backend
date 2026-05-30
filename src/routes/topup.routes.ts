import { Router } from 'express';
import {
  getActivePackage,
  buyCredits,
  redeemCode,
  getHistory,
  createCryptomusInvoice,
} from '@/controllers/topup.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/active-package', authMiddleware, getActivePackage);
router.post('/credits', authMiddleware, buyCredits);
router.post('/redeem', authMiddleware, redeemCode);
router.get('/history', authMiddleware, getHistory);
router.post('/cryptomus/create-invoice', authMiddleware, createCryptomusInvoice);

export default router;

