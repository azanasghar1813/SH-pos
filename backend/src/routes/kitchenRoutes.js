import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { kitchenController } from '../controllers/kitchenController.js';

const router = Router();

// Public LCD TV Screen endpoints (allows TV to display orders on LAN without login session)
router.get('/lcd-queue', kitchenController.getQueue);
router.post('/lcd-ready/:itemId', (req, res, next) => {
  req.user = { userId: 'KITCHEN_LCD', roleId: 'KITCHEN', permissions: ['KITCHEN_MANAGE'] };
  next();
}, kitchenController.markItemReady);
router.post('/lcd-served/:itemId', (req, res, next) => {
  req.user = { userId: 'KITCHEN_LCD', roleId: 'KITCHEN', permissions: ['KITCHEN_MANAGE'] };
  next();
}, kitchenController.markItemServed);
router.post('/lcd-start/:itemId', (req, res, next) => {
  req.user = { userId: 'KITCHEN_LCD', roleId: 'KITCHEN', permissions: ['KITCHEN_MANAGE'] };
  next();
}, kitchenController.startPreparingItem);

router.use(authenticate);

router.get('/queue', kitchenController.getQueue);
router.get('/summary', kitchenController.getSummary);
router.get('/tickets/:orderId', kitchenController.getTicket);
router.post('/items/:itemId/accept', kitchenController.markItemSent);
router.post('/items/:itemId/start', kitchenController.startPreparingItem);
router.post('/items/:itemId/ready', kitchenController.markItemReady);
router.post('/items/:itemId/served', kitchenController.markItemServed);
router.post('/items/:itemId/complete', kitchenController.completeItem);
router.post('/items/:itemId/cancel', kitchenController.cancelItem);
router.post('/items/:itemId/return-to-preparing', kitchenController.returnItemToPreparing);
router.patch('/orders/:orderId/note', kitchenController.addOrderNote);
router.patch('/items/:itemId/note', kitchenController.addItemNote);
router.patch('/orders/:orderId/priority', kitchenController.setPriority);
router.post('/clear-failed', kitchenController.clearFailed);

export default router;
