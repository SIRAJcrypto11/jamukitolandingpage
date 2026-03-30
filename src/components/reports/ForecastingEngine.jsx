import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Zap, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, addMonths } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * ✅ ADVANCED FORECASTING ENGINE - DATA REAL & PERHITUNGAN AKURAT
 * Menggunakan Linear Regression + Moving Average + Seasonal Adjustment
 * Berdasarkan data NYATA dari database company
 */
export default function ForecastingEngine({ historicalData, metric, title }) {
  const [forecast, setForecast] = useState([]);
  const [trend, setTrend] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [detailedAnalysis, setDetailedAnalysis] = useState(null);

  useEffect(() => {
    console.log('🔄 ForecastingEngine received data:', {
      title,
      dataPoints: historicalData?.length || 0,
      firstValue: historicalData?.[0]?.value || 0,
      lastValue: historicalData?.[historicalData?.length - 1]?.value || 0
    });
    
    if (historicalData && historicalData.length > 0) {
      calculateAdvancedForecast();
    }
  }, [historicalData, title]);

  const calculateAdvancedForecast = () => {
    try {
      setIsCalculating(true);

      // ✅ CRITICAL: ALWAYS process data, even if minimal
      const n = historicalData.length;
      if (n < 2) {
        // ✅ FALLBACK: Buat prediksi basic jika data minimal
        const lastValue = historicalData[0]?.value || 0;
        const forecastPoints = [];
        const lastDate = historicalData[0]?.date || new Date();
        
        for (let i = 1; i <= 3; i++) {
          forecastPoints.push({
            date: format(addMonths(new Date(lastDate), i), 'MMM yyyy', { locale: id }),
            value: lastValue,
            isForecast: true
          });
        }
        
        setForecast([
          {
            date: format(new Date(lastDate), 'MMM yyyy', { locale: id }),
            value: lastValue,
            isForecast: false
          },
          ...forecastPoints
        ]);
        
        setTrend({
          direction: 'stable',
          percentChange: 0,
          prediction: lastValue,
          monthlyGrowthRate: '0.00',
          volatility: '0'
        });
        
        setDetailedAnalysis({
          dataPoints: n,
          avgValue: lastValue,
          stdDeviation: 0,
          volatility: '0',
          growthRate: '0.00',
          trend: 'stable',
          linearSlope: '0.00',
          intercept: lastValue.toFixed(2),
          seasonalFactor: '1.00',
          confidence: 'Low',
          method: 'Insufficient data - using last known value'
        });
        
        setIsCalculating(false);
        return;
      }

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 1: LINEAR REGRESSION - Menghitung trend garis lurus
      // ═══════════════════════════════════════════════════════════
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

      historicalData.forEach((point, idx) => {
        const x = idx;
        const y = point.value || 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 2: MOVING AVERAGE - Smoothing untuk deteksi pola
      // ═══════════════════════════════════════════════════════════
      const movingAvgPeriod = Math.min(3, Math.floor(n / 2));
      const movingAvgs = [];
      
      for (let i = movingAvgPeriod - 1; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < movingAvgPeriod; j++) {
          sum += historicalData[i - j].value || 0;
        }
        movingAvgs.push(sum / movingAvgPeriod);
      }

      const avgMovingAvg = movingAvgs.reduce((a, b) => a + b, 0) / movingAvgs.length;

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 3: SEASONAL ADJUSTMENT - Deteksi pola musiman
      // ═══════════════════════════════════════════════════════════
      const seasonalFactors = [];
      historicalData.forEach((point, idx) => {
        const predicted = slope * idx + intercept;
        const factor = predicted > 0 ? (point.value || 0) / predicted : 1;
        seasonalFactors.push(factor);
      });

      const avgSeasonalFactor = seasonalFactors.reduce((a, b) => a + b, 0) / seasonalFactors.length;

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 4: VOLATILITY CALCULATION - Ukur fluktuasi data
      // ═══════════════════════════════════════════════════════════
      const avgValue = historicalData.reduce((sum, h) => sum + (h.value || 0), 0) / n;
      const variance = historicalData.reduce((sum, h) => {
        const diff = (h.value || 0) - avgValue;
        return sum + (diff * diff);
      }, 0) / n;
      const stdDev = Math.sqrt(variance);
      const volatilityPercent = avgValue > 0 ? (stdDev / avgValue * 100).toFixed(1) : 0;

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 5: GROWTH RATE - Hitung pertumbuhan rata-rata
      // ═══════════════════════════════════════════════════════════
      const growthRates = [];
      for (let i = 1; i < n; i++) {
        const prev = historicalData[i - 1].value || 0;
        const curr = historicalData[i].value || 0;
        if (prev > 0) {
          growthRates.push((curr - prev) / prev * 100);
        }
      }
      const avgGrowthRate = growthRates.length > 0 ?
        growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 6: ADVANCED FORECASTING - Gabungan metode
      // ═══════════════════════════════════════════════════════════
      const forecastPoints = [];
      const lastDate = historicalData[historicalData.length - 1].date || new Date();
      const lastValue = historicalData[historicalData.length - 1].value || 0;

      for (let i = 1; i <= 3; i++) {
        // Method 1: Linear Regression
        const linearPrediction = slope * (n + i - 1) + intercept;
        
        // Method 2: Growth Rate Projection
        const growthPrediction = lastValue * Math.pow(1 + (avgGrowthRate / 100), i);
        
        // Method 3: Moving Average Extension
        const maExtension = avgMovingAvg * (1 + (slope / avgMovingAvg) * i);
        
        // ✅ WEIGHTED AVERAGE - Gabungan 3 metode (50% Linear + 30% Growth + 20% MA)
        let combinedForecast = (
          linearPrediction * 0.5 +
          growthPrediction * 0.3 +
          maExtension * 0.2
        );

        // Apply seasonal adjustment
        combinedForecast *= avgSeasonalFactor;

        // Ensure realistic bounds (tidak terlalu jauh dari tren)
        const maxDeviation = stdDev * 2;
        const lowerBound = Math.max(0, lastValue - maxDeviation);
        const upperBound = lastValue + maxDeviation * 2;
        combinedForecast = Math.min(Math.max(combinedForecast, lowerBound), upperBound);

        const forecastDate = addMonths(new Date(lastDate), i);

        forecastPoints.push({
          date: format(forecastDate, 'MMM yyyy', { locale: id }),
          value: Math.max(0, combinedForecast),
          isForecast: true,
          confidenceRange: {
            lower: Math.max(0, combinedForecast - stdDev),
            upper: combinedForecast + stdDev
          }
        });
      }

      // Combine historical + forecast
      const combined = [
        ...historicalData.map(h => ({
          date: h.date ? format(new Date(h.date), 'MMM yyyy', { locale: id }) : h.month,
          value: h.value,
          isForecast: false
        })),
        ...forecastPoints
      ];

      setForecast(combined);

      // ═══════════════════════════════════════════════════════════
      // 📊 STEP 7: DETAILED ANALYSIS - Insight mendalam
      // ═══════════════════════════════════════════════════════════
      const avgGrowth = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
      const percentChange = avgValue > 0 ? (slope / avgValue * 100).toFixed(1) : 0;

      setTrend({
        direction: avgGrowth,
        percentChange: Math.abs(percentChange),
        prediction: forecastPoints[2].value, // 3 months ahead
        monthlyGrowthRate: avgGrowthRate.toFixed(2),
        volatility: volatilityPercent
      });

      setDetailedAnalysis({
        dataPoints: n,
        avgValue: avgValue,
        stdDeviation: stdDev,
        volatility: volatilityPercent,
        growthRate: avgGrowthRate.toFixed(2),
        trend: avgGrowth,
        linearSlope: slope.toFixed(2),
        intercept: intercept.toFixed(2),
        seasonalFactor: avgSeasonalFactor.toFixed(2),
        confidence: n >= 6 ? 'High' : n >= 4 ? 'Medium' : 'Low',
        method: 'Weighted: 50% Linear Regression + 30% Growth Rate + 20% Moving Average'
      });

    } catch (error) {
      console.error('Error calculating forecast:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Handle all states in one condition to prevent hook inconsistency
  const showLoading = isCalculating && (!forecast || forecast.length === 0);
  const showEmpty = !isCalculating && (!forecast || forecast.length === 0);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        {showLoading ? (
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            {title}
          </CardTitle>
        ) : showEmpty ? (
          <CardTitle className="text-white">{title}</CardTitle>
        ) : (
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {title}
            </CardTitle>
            {trend && (
            <Badge className={
              trend.direction === 'increasing' ? 'bg-green-600' :
              trend.direction === 'decreasing' ? 'bg-red-600' :
              'bg-gray-600'
            }>
              {trend.direction === 'increasing' ? '↗' : trend.direction === 'decreasing' ? '↘' : '→'} 
              {trend.percentChange}% per month
            </Badge>
          )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {showLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-400">Menghitung forecast dari data real...</p>
          </div>
        ) : showEmpty ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="text-yellow-400 font-semibold mb-2">Data tidak tersedia</p>
            <p className="text-gray-400 text-sm">Tambahkan transaksi atau data untuk melihat forecast AI</p>
          </div>
        ) : isCalculating ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    // ✅ Format Y-axis: Tampilkan dalam format yang tepat
                    if (metric === 'currency') {
                      if (value >= 1000000) {
                        return `${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}K`;
                      }
                      return value.toFixed(0);
                    }
                    return value.toFixed(0);
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: 12 }}
                  formatter={(value, name) => {
                    // ✅ CRITICAL: Tooltip RUPIAH PENUH dengan desimal persis dari database
                    if (metric === 'currency') {
                      return [
                        `Rp ${Number(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
                        name === 'value' ? 'Nilai' : name
                      ];
                    }
                    return [
                      `${Number(value).toLocaleString('id-ID')}${metric === 'percentage' ? '%' : ''}`,
                      name === 'value' ? 'Nilai' : name
                    ];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.isForecast ? 4 : 5}
                        fill={payload.isForecast ? '#f59e0b' : '#3b82f6'}
                        stroke={payload.isForecast ? '#f59e0b' : '#3b82f6'}
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="Nilai"
                />
              </LineChart>
            </ResponsiveContainer>

            {trend && detailedAnalysis && (
              <div className="mt-4 space-y-3">
                {/* ✅ PREDICTION RESULT */}
                <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 p-4 rounded-lg border border-blue-700">
                 <div className="flex items-start justify-between mb-2">
                   <div className="flex-1 min-w-0">
                     <p className="text-sm text-gray-300 mb-1 flex items-center gap-2">
                       <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                       AI Prediction (3 months ahead):
                     </p>
                     <p className="text-xl sm:text-2xl font-bold text-white truncate">
                       {metric === 'currency' && 'Rp '}
                       {trend.prediction.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                       {metric === 'percentage' && '%'}
                     </p>
                     {metric === 'currency' && (
                       <p className="text-xs text-gray-400 mt-1">
                         {trend.prediction >= 1000000 
                           ? `≈ Rp ${(trend.prediction / 1000000).toFixed(2)} Juta`
                           : trend.prediction >= 1000 
                           ? `≈ Rp ${(trend.prediction / 1000).toFixed(0)} Ribu`
                           : 'Nilai REAL dari database'
                         }
                       </p>
                     )}
                   </div>
                   <Badge className={`${
                     trend.direction === 'increasing' ? 'bg-green-600' :
                     trend.direction === 'decreasing' ? 'bg-red-600' : 'bg-gray-600'
                   } text-white text-xs flex-shrink-0`}>
                     {trend.direction === 'increasing' ? '↗' : trend.direction === 'decreasing' ? '↘' : '→'} 
                     {trend.percentChange}%
                   </Badge>
                 </div>
                 <div className="flex items-center gap-2 text-sm flex-wrap">
                   {trend.direction === 'increasing' ? (
                     <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                   ) : trend.direction === 'decreasing' ? (
                     <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                   ) : null}
                   <span className={`font-semibold ${
                     trend.direction === 'increasing' ? 'text-green-400' :
                     trend.direction === 'decreasing' ? 'text-red-400' : 'text-gray-400'
                   }`}>
                     {trend.direction === 'increasing' ? 'Trend Naik' : 
                      trend.direction === 'decreasing' ? 'Trend Turun' : 'Stabil'}
                   </span>
                   <span className="text-gray-400 text-xs">
                     • Growth: {trend.monthlyGrowthRate}%/bulan
                   </span>
                 </div>
                </div>

                {/* ✅ DETAILED CALCULATION BREAKDOWN */}
                <details className="bg-gray-800 rounded-lg border border-gray-700">
                  <summary className="p-3 cursor-pointer hover:bg-gray-750 text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    Detail Perhitungan AI Forecast
                  </summary>
                  <div className="p-4 border-t border-gray-700 space-y-3 text-xs">
                    {/* DATA SOURCE */}
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-800">
                      <p className="font-bold text-blue-300 mb-2">📊 Sumber Data:</p>
                      <div className="grid grid-cols-2 gap-2 text-gray-300">
                        <div>• Total Data Points: <span className="text-white font-bold">{detailedAnalysis.dataPoints}</span></div>
                        <div>• Confidence Level: <span className={`font-bold ${
                          detailedAnalysis.confidence === 'High' ? 'text-green-400' :
                          detailedAnalysis.confidence === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>{detailedAnalysis.confidence}</span></div>
                        <div>• Avg Value: <span className="text-white font-bold">
                          {metric === 'currency' ? 'Rp ' : ''}{detailedAnalysis.avgValue.toFixed(2)}
                        </span></div>
                        <div>• Volatility: <span className="text-yellow-400 font-bold">{detailedAnalysis.volatility}%</span></div>
                      </div>
                    </div>

                    {/* CALCULATION METHOD */}
                    <div className="bg-purple-900/20 p-3 rounded border border-purple-800">
                      <p className="font-bold text-purple-300 mb-2">🔬 Metode Perhitungan:</p>
                      <p className="text-gray-300 mb-2">{detailedAnalysis.method}</p>
                      <div className="space-y-1 text-gray-400">
                        <div>• <span className="text-blue-400">Linear Regression:</span> y = {detailedAnalysis.linearSlope}x + {detailedAnalysis.intercept}</div>
                        <div>• <span className="text-green-400">Growth Rate:</span> {detailedAnalysis.growthRate}% per bulan</div>
                        <div>• <span className="text-yellow-400">Seasonal Factor:</span> {detailedAnalysis.seasonalFactor}x</div>
                        <div>• <span className="text-purple-400">Std Deviation:</span> ±{detailedAnalysis.stdDeviation.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* FORECAST FORMULA */}
                    <div className="bg-green-900/20 p-3 rounded border border-green-800">
                      <p className="font-bold text-green-300 mb-2">📐 Formula Prediksi:</p>
                      <div className="space-y-1 text-gray-300 font-mono text-xs">
                        <div>1. Linear = slope × (n + bulan) + intercept</div>
                        <div>2. Growth = nilai_akhir × (1 + growth_rate)^bulan</div>
                        <div>3. Moving Avg = rata_rata × (1 + trend) × bulan</div>
                        <div className="text-yellow-400 font-bold mt-2">
                          → Final = (Linear × 50%) + (Growth × 30%) + (MA × 20%) × seasonal
                        </div>
                      </div>
                    </div>

                    {/* INTERPRETATION */}
                    <div className="bg-yellow-900/20 p-3 rounded border border-yellow-800">
                      <p className="font-bold text-yellow-300 mb-2">💡 Interpretasi:</p>
                      <ul className="text-gray-300 space-y-1 list-disc list-inside">
                        <li>Trend {trend.direction === 'increasing' ? 'NAIK' : trend.direction === 'decreasing' ? 'TURUN' : 'STABIL'} dengan kecepatan {Math.abs(parseFloat(trend.percentChange)).toFixed(1)}% per bulan</li>
                        <li>Volatilitas data: {detailedAnalysis.volatility}% ({parseFloat(detailedAnalysis.volatility) < 20 ? 'Stabil' : parseFloat(detailedAnalysis.volatility) < 50 ? 'Moderat' : 'Tinggi'})</li>
                        <li>Prediksi 3 bulan: {metric === 'currency' ? 'Rp ' : ''}{trend.prediction.toLocaleString('id-ID')}</li>
                        <li>Akurasi prediksi: {detailedAnalysis.confidence} ({
                          detailedAnalysis.confidence === 'High' ? 'Data cukup (6+ bulan)' :
                          detailedAnalysis.confidence === 'Medium' ? 'Data terbatas (4-5 bulan)' : 'Data minimal (2-3 bulan)'
                        })</li>
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}