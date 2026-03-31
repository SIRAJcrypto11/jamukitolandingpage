import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Save, Loader2, AlertCircle, CheckCircle, X, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductionOrderForm({ company_id, order = null, onSuccess, onClose }) {
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedBOM, setSelectedBOM] = useState(null);
  
  const [formData, setFormData] = useState({
    order_number: '',
    product_id: '',
    product_name: '',
    bom_id: '',
    quantity_to_produce: 1,
    quantity_produced: 0,
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    status: 'planned',
    priority: 'normal',
    assigned_to: [],
    labor_hours: 0,
    labor_cost: 0,
    overhead_cost: 0,
    batch_number: '',
    notes: ''
  });

  const [materialsConsumption, setMaterialsConsumption] = useState([]);
  const [qualityCheck, setQualityCheck] = useState({
    passed: 0,
    failed: 0,
    inspector: '',
    inspection_date: '',
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [materialAvailability, setMaterialAvailability] = useState({});

  useEffect(() => {
    loadData();
    if (order) {
      setFormData({
        order_number: order.order_number,
        product_id: order.product_id,
        product_name: order.product_name,
        bom_id: order.bom_id,
        quantity_to_produce: order.quantity_to_produce,
        quantity_produced: order.quantity_produced || 0,
        planned_start_date: order.planned_start_date?.split('T')[0] || '',
        planned_end_date: order.planned_end_date?.split('T')[0] || '',
        actual_start_date: order.actual_start_date?.split('T')[0] || '',
        actual_end_date: order.actual_end_date?.split('T')[0] || '',
        status: order.status,
        priority: order.priority,
        assigned_to: order.assigned_to || [],
        labor_hours: order.labor_hours || 0,
        labor_cost: order.labor_cost || 0,
        overhead_cost: order.overhead_cost || 0,
        batch_number: order.batch_number || '',
        notes: order.notes || ''
      });
      setMaterialsConsumption(order.materials_consumed || []);
      setQualityCheck(order.quality_check || {
        passed: 0,
        failed: 0,
        inspector: '',
        inspection_date: '',
        notes: ''
      });
    } else {
      // Generate order number
      const orderNum = `PO-${Date.now().toString().slice(-8)}`;
      setFormData(prev => ({ ...prev, order_number: orderNum }));
    }
  }, [order]);

  const loadData = async () => {
    try {
      const [bomsData, productsData, employeesData, materialsData] = await Promise.all([
        base44.entities.BillOfMaterials.filter({ company_id, is_active: true }),
        base44.entities.CompanyPOSProduct.filter({ company_id }),
        base44.entities.CompanyMember.filter({ company_id, status: 'active' }),
        base44.entities.RawMaterial.filter({ company_id, is_active: true })
      ]);

      setBoms(bomsData || []);
      setProducts(productsData || []);
      setEmployees(employeesData || []);
      setRawMaterials(materialsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    }
  };

  const handleBOMChange = async (bomId) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return;

    setSelectedBOM(bom);
    setFormData(prev => ({
      ...prev,
      bom_id: bomId,
      product_id: bom.product_id,
      product_name: bom.product_name,
      labor_cost: bom.labor_cost || 0,
      overhead_cost: bom.overhead_cost || 0
    }));

    // Calculate materials needed
    const materials = bom.materials.map(m => ({
      material_id: m.material_id,
      material_name: m.material_name,
      material_code: m.material_code,
      quantity_used: m.quantity_needed * formData.quantity_to_produce,
      unit: m.unit,
      cost: m.unit_cost * m.quantity_needed * formData.quantity_to_produce
    }));

    setMaterialsConsumption(materials);

    // Check material availability
    await checkMaterialAvailability(materials);
  };

  const checkMaterialAvailability = async (materials) => {
    const availability = {};
    
    for (const mat of materials) {
      const rawMat = rawMaterials.find(rm => rm.id === mat.material_id);
      if (rawMat) {
        const available = rawMat.current_stock >= mat.quantity_used;
        availability[mat.material_id] = {
          available,
          currentStock: rawMat.current_stock,
          needed: mat.quantity_used,
          shortage: available ? 0 : mat.quantity_used - rawMat.current_stock
        };
      }
    }

    setMaterialAvailability(availability);
  };

  const handleQuantityChange = (quantity) => {
    setFormData(prev => ({ ...prev, quantity_to_produce: quantity }));

    if (selectedBOM) {
      const materials = selectedBOM.materials.map(m => ({
        material_id: m.material_id,
        material_name: m.material_name,
        material_code: m.material_code,
        quantity_used: m.quantity_needed * quantity,
        unit: m.unit,
        cost: m.unit_cost * m.quantity_needed * quantity
      }));

      setMaterialsConsumption(materials);
      checkMaterialAvailability(materials);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setFormData(prev => ({ ...prev, status: newStatus }));

    // Auto-fill dates based on status
    const now = new Date().toISOString().split('T')[0];
    if (newStatus === 'in_progress' && !formData.actual_start_date) {
      setFormData(prev => ({ ...prev, actual_start_date: now }));
    }
    if (newStatus === 'completed' && !formData.actual_end_date) {
      setFormData(prev => ({ ...prev, actual_end_date: now }));
    }
  };

  const calculateTotalCost = () => {
    const materialCost = materialsConsumption.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCost = materialCost + formData.labor_cost + formData.overhead_cost;
    const costPerUnit = formData.quantity_to_produce > 0 ? totalCost / formData.quantity_to_produce : 0;

    return {
      material_cost: materialCost,
      total_production_cost: totalCost,
      cost_per_unit: costPerUnit
    };
  };

  const deductMaterialsFromInventory = async (orderId) => {
    try {
      for (const material of materialsConsumption) {
        // Update raw material stock
        const rawMat = rawMaterials.find(rm => rm.id === material.material_id);
        if (rawMat) {
          const newStock = rawMat.current_stock - material.quantity_used;
          await base44.entities.RawMaterial.update(material.material_id, {
            current_stock: newStock
          });

          // Create stock movement record
          await base44.entities.StockMovement.create({
            company_id,
            inventory_id: material.material_id,
            product_id: material.material_id,
            product_name: material.material_name,
            location_id: 'production',
            location_name: 'Production Floor',
            movement_type: 'out',
            quantity: material.quantity_used,
            stock_before: rawMat.current_stock,
            stock_after: newStock,
            reference_type: 'production',
            reference_id: orderId,
            reason: `Production Order ${formData.order_number}`,
            unit_cost: material.cost / material.quantity_used,
            total_value: material.cost,
            performed_by: company_id,
            notes: `Consumed for production order ${formData.order_number}`
          });
        }
      }
    } catch (error) {
      console.error('Error deducting materials:', error);
      throw error;
    }
  };

  const addToFinishedGoodsInventory = async (orderId) => {
    try {
      // Check if inventory record exists
      const existingInventory = await base44.entities.Inventory.filter({
        company_id,
        product_id: formData.product_id,
        location_id: 'warehouse'
      });

      const quantityProduced = formData.quantity_produced || formData.quantity_to_produce;
      const costs = calculateTotalCost();

      if (existingInventory && existingInventory.length > 0) {
        const inv = existingInventory[0];
        const newQuantity = (inv.quantity || 0) + quantityProduced;
        
        await base44.entities.Inventory.update(inv.id, {
          quantity: newQuantity,
          available_quantity: newQuantity - (inv.reserved_quantity || 0),
          unit_cost: costs.cost_per_unit,
          total_value: newQuantity * costs.cost_per_unit
        });
      } else {
        await base44.entities.Inventory.create({
          company_id,
          product_id: formData.product_id,
          product_name: formData.product_name,
          location_id: 'warehouse',
          location_name: 'Main Warehouse',
          quantity: quantityProduced,
          available_quantity: quantityProduced,
          unit_cost: costs.cost_per_unit,
          total_value: quantityProduced * costs.cost_per_unit,
          stock_status: 'in_stock'
        });
      }

      // Create stock movement for finished goods
      await base44.entities.StockMovement.create({
        company_id,
        product_id: formData.product_id,
        product_name: formData.product_name,
        location_id: 'warehouse',
        location_name: 'Main Warehouse',
        movement_type: 'in',
        quantity: quantityProduced,
        reference_type: 'production',
        reference_id: orderId,
        reason: `Production completed - Order ${formData.order_number}`,
        unit_cost: costs.cost_per_unit,
        total_value: quantityProduced * costs.cost_per_unit,
        performed_by: company_id
      });
    } catch (error) {
      console.error('Error adding to inventory:', error);
      throw error;
    }
  };

  const createLotBatch = async (orderId) => {
    try {
      const costs = calculateTotalCost();
      const quantityProduced = formData.quantity_produced || formData.quantity_to_produce;

      const lotNumber = formData.batch_number || `LOT-${Date.now().toString().slice(-8)}`;
      
      await base44.entities.LotBatch.create({
        company_id,
        lot_number: lotNumber,
        product_id: formData.product_id,
        product_name: formData.product_name,
        production_order_id: orderId,
        quantity: quantityProduced,
        quantity_remaining: quantityProduced,
        manufacture_date: formData.actual_end_date || new Date().toISOString().split('T')[0],
        location_id: 'warehouse',
        location_name: 'Main Warehouse',
        cost_per_unit: costs.cost_per_unit,
        status: 'active',
        quality_status: qualityCheck.passed > 0 ? 'passed' : 'pending'
      });

      toast.success(`✅ Lot/Batch ${lotNumber} created`);
    } catch (error) {
      console.error('Error creating lot:', error);
      toast.error('Failed to create lot/batch');
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.product_id || !formData.bom_id) {
      toast.error('Pilih produk dan BOM terlebih dahulu');
      return;
    }

    if (!formData.planned_start_date || !formData.planned_end_date) {
      toast.error('Tentukan tanggal mulai dan selesai produksi');
      return;
    }

    // Check material availability
    const hasShortage = Object.values(materialAvailability).some(m => !m.available);
    if (hasShortage && !order) {
      const confirmProceed = confirm(
        'Beberapa bahan baku tidak mencukupi. Lanjutkan membuat production order?'
      );
      if (!confirmProceed) return;
    }

    try {
      setIsSaving(true);

      const costs = calculateTotalCost();

      const productionOrderData = {
        company_id,
        ...formData,
        materials_consumed: materialsConsumption,
        total_production_cost: costs.total_production_cost,
        cost_per_unit: costs.cost_per_unit,
        quality_check: qualityCheck
      };

      let savedOrder;

      if (order) {
        // Update existing order
        await base44.entities.ProductionOrder.update(order.id, productionOrderData);
        savedOrder = { ...order, ...productionOrderData };
        toast.success('✅ Production Order berhasil diperbarui');

        // If status changed to completed, process inventory
        if (formData.status === 'completed' && order.status !== 'completed') {
          await deductMaterialsFromInventory(order.id);
          await addToFinishedGoodsInventory(order.id);
          await createLotBatch(order.id);
          toast.success('✅ Inventory berhasil diupdate');
        }
      } else {
        // Create new order
        savedOrder = await base44.entities.ProductionOrder.create(productionOrderData);
        toast.success('✅ Production Order berhasil dibuat');

        // If starting as in_progress or completed, deduct materials immediately
        if (formData.status === 'in_progress' || formData.status === 'completed') {
          await deductMaterialsFromInventory(savedOrder.id);
          toast.success('✅ Material berhasil dikonsumsi dari inventory');
        }

        // If completed, add to finished goods
        if (formData.status === 'completed') {
          await addToFinishedGoodsInventory(savedOrder.id);
          await createLotBatch(savedOrder.id);
        }
      }

      if (onSuccess) onSuccess(savedOrder);
    } catch (error) {
      console.error('Error saving production order:', error);
      toast.error('Gagal menyimpan production order: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const costs = calculateTotalCost();
  const hasShortage = Object.values(materialAvailability).some(m => !m.available);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white">
            {order ? 'Edit Production Order' : 'Buat Production Order Baru'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300">Order Number</Label>
                  <Input
                    value={formData.order_number}
                    disabled
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">BOM / Product *</Label>
                  <Select value={formData.bom_id} onValueChange={handleBOMChange}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Pilih BOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {boms.map(bom => (
                        <SelectItem key={bom.id} value={bom.id}>
                          {bom.product_name} - {bom.bom_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Quantity to Produce *</Label>
                  <Input
                    type="number"
                    value={formData.quantity_to_produce}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white"
                    min="1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Planned Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Planned End Date *</Label>
                  <Input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Priority</Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Status</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Batch Number</Label>
                  <Input
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="Auto-generated"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Quantity Produced</Label>
                  <Input
                    type="number"
                    value={formData.quantity_produced}
                    onChange={(e) => setFormData({ ...formData, quantity_produced: parseInt(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white"
                    min="0"
                    max={formData.quantity_to_produce}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Consumption */}
          {materialsConsumption.length > 0 && (
            <Card className={`${hasShortage ? 'bg-red-900/20 border-red-800' : 'bg-gray-900/50 border-gray-800'}`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  Materials Consumption
                  {hasShortage && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materialsConsumption.map((mat, idx) => {
                    const availability = materialAvailability[mat.material_id];
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border ${
                          availability && !availability.available 
                            ? 'bg-red-900/20 border-red-700' 
                            : 'bg-gray-800/50 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-white font-medium">{mat.material_name}</p>
                            <p className="text-sm text-gray-400">
                              Needed: {mat.quantity_used} {mat.unit} × Rp {(mat.cost / mat.quantity_used).toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div className="text-right">
                            {availability && (
                              <>
                                {availability.available ? (
                                  <div className="flex items-center gap-2 text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm">Available: {availability.currentStock}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-red-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">
                                      Short: {availability.shortage} {mat.unit}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            <p className="text-white font-semibold">
                              Rp {mat.cost.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Labor & Costs */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Labor & Production Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300">Actual Labor Hours</Label>
                  <Input
                    type="number"
                    value={formData.labor_hours}
                    onChange={(e) => setFormData({ ...formData, labor_hours: parseFloat(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white"
                    step="0.5"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Labor Cost</Label>
                  <Input
                    type="number"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Overhead Cost</Label>
                  <Input
                    type="number"
                    value={formData.overhead_cost}
                    onChange={(e) => setFormData({ ...formData, overhead_cost: parseFloat(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Actual Start Date</Label>
                  <Input
                    type="date"
                    value={formData.actual_start_date}
                    onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Actual End Date</Label>
                  <Input
                    type="date"
                    value={formData.actual_end_date}
                    onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assign Employees */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Assigned Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.assigned_to.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assigned_to: [...formData.assigned_to, emp.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assigned_to: formData.assigned_to.filter(id => id !== emp.id)
                          });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <Label className="text-gray-300 text-sm">{emp.user_name}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Check */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quality Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300">Passed (units)</Label>
                  <Input
                    type="number"
                    value={qualityCheck.passed}
                    onChange={(e) => setQualityCheck({ ...qualityCheck, passed: parseInt(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white"
                    min="0"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Failed (units)</Label>
                  <Input
                    type="number"
                    value={qualityCheck.failed}
                    onChange={(e) => setQualityCheck({ ...qualityCheck, failed: parseInt(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white"
                    min="0"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Inspector</Label>
                  <Input
                    value={qualityCheck.inspector}
                    onChange={(e) => setQualityCheck({ ...qualityCheck, inspector: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Inspection Date</Label>
                  <Input
                    type="date"
                    value={qualityCheck.inspection_date}
                    onChange={(e) => setQualityCheck({ ...qualityCheck, inspection_date: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">QC Notes</Label>
                <Textarea
                  value={qualityCheck.notes}
                  onChange={(e) => setQualityCheck({ ...qualityCheck, notes: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Production Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
                placeholder="Catatan produksi..."
              />
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-400" />
                Production Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Material Cost</p>
                  <p className="text-2xl font-bold text-white">
                    Rp {costs.material_cost.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Total Production Cost</p>
                  <p className="text-2xl font-bold text-green-400">
                    Rp {costs.total_production_cost.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Cost Per Unit</p>
                  <p className="text-2xl font-bold text-blue-400">
                    Rp {costs.cost_per_unit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end sticky bottom-0 bg-gray-900 pt-4 border-t border-gray-800">
            <Button onClick={onClose} variant="outline" className="border-gray-700">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Production Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}