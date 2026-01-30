const { Return, SalesOrder, Shipment, Customer, Product, ProductStock, sequelize } = require('../models');

exports.createRMA = async (req, res) => {
    const { salesOrderId, shipmentId, reason, returnType, notes, items } = req.body;
    const companyId = req.user.companyId;

    const t = await sequelize.transaction();
    try {
        // 1. Validate Sales Order
        const order = await SalesOrder.findOne({ where: { id: salesOrderId, companyId } });
        if (!order) throw new Error('Sales Order not found');
        if (order.status !== 'DELIVERED') throw new Error('RMA can only be created for DELIVERED orders');

        // 2. Validate Shipment
        const shipment = await Shipment.findOne({ where: { id: shipmentId, companyId } });
        if (!shipment) throw new Error('Shipment record not found');

        // 3. Generate RMA Number
        const count = await Return.count({ where: { companyId } });
        const rmaNumber = `RMA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        // 4. Create Return Record
        const newReturn = await Return.create({
            companyId,
            rmaNumber,
            salesOrderId,
            shipmentId,
            customerId: order.customerId,
            status: 'RMA_CREATED',
            returnType,
            reason,
            notes,
            createdBy: req.user.id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, data: newReturn });
    } catch (error) {
        await t.rollback();
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getAllReturns = async (req, res) => {
    try {
        const returns = await Return.findAll({
            where: { companyId: req.user.companyId },
            include: [
                { model: SalesOrder, attributes: ['orderNumber'] },
                { model: Customer, attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: returns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getReturnById = async (req, res) => {
    try {
        const rma = await Return.findOne({
            where: { id: req.params.id, companyId: req.user.companyId },
            include: [SalesOrder, Shipment, Customer]
        });
        if (!rma) return res.status(404).json({ success: false, message: 'RMA not found' });
        res.json({ success: true, data: rma });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.receiveItem = async (req, res) => {
    try {
        const rma = await Return.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
        if (!rma) throw new Error('RMA not found');

        // Strict Flow: RMA_CREATED or AWAITING_RETURN -> RECEIVED
        if (!['RMA_CREATED', 'AWAITING_RETURN'].includes(rma.status)) {
            throw new Error(`Cannot receive item. Current status: ${rma.status}`);
        }

        await rma.update({
            status: 'RECEIVED',
            receivedAt: new Date()
        });

        res.json({ success: true, data: rma });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.inspectRMA = async (req, res) => {
    // Outcome: APPROVED or REJECTED
    const { outcome, recoveryValue, notes } = req.body; // outcome = 'APPROVED' | 'REJECTED'

    try {
        const rma = await Return.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
        if (!rma) throw new Error('RMA not found');

        if (rma.status !== 'RECEIVED' && rma.status !== 'IN_INSPECTION') {
            throw new Error('Item must be RECEIVED before inspection');
        }

        if (!['APPROVED', 'REJECTED'].includes(outcome)) throw new Error('Invalid inspection outcome');

        await rma.update({
            status: outcome,
            recoveryValue: recoveryValue || 0,
            notes: notes ? (rma.notes + '\n' + notes) : rma.notes,
            inspectedAt: new Date()
        });

        // NOTE: Inventory updates (add stock) would happen here if APPROVED outcome
        // For now, we focus on status flow.

        res.json({ success: true, data: rma });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.processRefund = async (req, res) => {
    const { amount } = req.body;

    try {
        const rma = await Return.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
        if (!rma) throw new Error('RMA not found');

        if (rma.status !== 'APPROVED') throw new Error('RMA must be APPROVED before refund');

        await rma.update({
            status: 'REFUNDED',
            refundAmount: amount,
            completedAt: new Date()
        });

        res.json({ success: true, data: rma });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.closeRMA = async (req, res) => {
    try {
        const rma = await Return.findOne({ where: { id: req.params.id, companyId: req.user.companyId } });
        if (!rma) throw new Error('RMA not found');

        if (!['REFUNDED', 'REJECTED'].includes(rma.status)) {
            throw new Error('RMA can only be closed after Refund or Rejection');
        }

        await rma.update({ status: 'CLOSED' });
        res.json({ success: true, data: rma });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
