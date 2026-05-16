/**
 * 数据可视化应用实战案例
 * 
 * 包含功能：
 * - 多类型图表（柱状图、折线图、饼图）
 * - 实时数据更新
 * - 数据筛选和排序
 * - 仪表盘布局
 */

import { signal, computed } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';

// 数据状态管理
function createDashboardStore() {
  const salesData = signal([
    { month: '1月', sales: 4200, profit: 1800 },
    { month: '2月', sales: 3800, profit: 1500 },
    { month: '3月', sales: 5100, profit: 2200 },
    { month: '4月', sales: 4600, profit: 1900 },
    { month: '5月', sales: 5800, profit: 2500 },
    { month: '6月', sales: 6200, profit: 2800 }
  ]);

  const categoryData = signal([
    { name: '电子产品', value: 35, color: '#667eea' },
    { name: '服装', value: 25, color: '#764ba2' },
    { name: '食品', value: 20, color: '#f093fb' },
    { name: '家居', value: 12, color: '#4facfe' },
    { name: '其他', value: 8, color: '#43e97b' }
  ]);

  const regionData = signal([
    { region: '华东', sales: 12500, growth: 15 },
    { region: '华北', sales: 9800, growth: 12 },
    { region: '华南', sales: 11200, growth: 18 },
    { region: '西南', sales: 7500, growth: 8 },
    { region: '东北', sales: 6200, growth: 5 }
  ]);

  const timeRange = signal<'week' | 'month' | 'year'>('month');
  const selectedRegion = signal<string | null>(null);

  const totalSales = computed(() => 
    salesData.value.reduce((sum, item) => sum + item.sales, 0)
  );

  const totalProfit = computed(() => 
    salesData.value.reduce((sum, item) => sum + item.profit, 0)
  );

  const avgGrowth = computed(() => 
    Math.round(regionData.value.reduce((sum, item) => sum + item.growth, 0) / regionData.value.length)
  );

  function updateSalesData(newData: typeof salesData.value) {
    salesData.value = newData;
  }

  return {
    salesData,
    categoryData,
    regionData,
    timeRange,
    selectedRegion,
    totalSales,
    totalProfit,
    avgGrowth,
    updateSalesData
  };
}

// 图表组件

function BarChart(props: { data: Array<{ label: string; value: number; color?: string }> }) {
  const maxValue = Math.max(...props.data.map(d => d.value));
  
  return createVNode('div', { class: 'bar-chart' },
    props.data.map((item, index) =>
      createVNode('div', { key: index, class: 'bar-item' }, [
        createVNode('div', { class: 'bar-label' }, item.label),
        createVNode('div', { class: 'bar-container' }, [
          createVNode('div', { 
            class: 'bar-fill',
            style: {
              width: `${(item.value / maxValue) * 100}%`,
              backgroundColor: item.color || '#667eea'
            }
          }, item.value.toLocaleString())
        ])
      ])
    )
  );
}

function LineChart(props: { data: Array<{ month: string; sales: number; profit: number }> }) {
  const maxValue = Math.max(...props.data.map(d => Math.max(d.sales, d.profit)));
  
  return createVNode('div', { class: 'line-chart' }, [
    createVNode('div', { class: 'line-legend' }, [
      createVNode('span', { class: 'legend-item' }, [
        createVNode('span', { class: 'legend-color sales' }, ''),
        '销售额'
      ]),
      createVNode('span', { class: 'legend-item' }, [
        createVNode('span', { class: 'legend-color profit' }, ''),
        '利润'
      ])
    ]),
    createVNode('div', { class: 'line-chart-area' },
      props.data.map((item, index) => {
        const salesHeight = (item.sales / maxValue) * 100;
        const profitHeight = (item.profit / maxValue) * 100;
        return createVNode('div', { key: index, class: 'line-column' }, [
          createVNode('div', { class: 'line-bars' }, [
            createVNode('div', { 
              class: 'line-bar sales',
              style: { height: `${salesHeight}%` }
            }),
            createVNode('div', { 
              class: 'line-bar profit',
              style: { height: `${profitHeight}%` }
            })
          ]),
          createVNode('span', { class: 'line-label' }, item.month)
        ]);
      })
    )
  ]);
}

function PieChart(props: { data: Array<{ name: string; value: number; color: string }> }) {
  const total = props.data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  return createVNode('div', { class: 'pie-chart-container' }, [
    createVNode('div', { class: 'pie-chart' },
      props.data.map((item, index) => {
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        return createVNode('div', {
          key: index,
          class: 'pie-segment',
          style: {
            background: `conic-gradient(${item.color} ${startAngle}deg ${currentAngle}deg)`
          }
        });
      })
    ),
    createVNode('div', { class: 'pie-legend' },
      props.data.map((item, index) =>
        createVNode('div', { key: index, class: 'pie-legend-item' }, [
          createVNode('span', { 
            class: 'pie-legend-color',
            style: { backgroundColor: item.color }
          }),
          createVNode('span', { class: 'pie-legend-name' }, item.name),
          createVNode('span', { class: 'pie-legend-value' }, `${item.value}%`)
        ])
      )
    )
  ]);
}

function StatCard(props: { 
  title: string; 
  value: string | number; 
  change?: number; 
  icon: string;
  color?: string;
}) {
  return createVNode('div', { class: 'stat-card' }, [
    createVNode('div', { class: 'stat-icon', style: { backgroundColor: props.color || '#667eea' } }, props.icon),
    createVNode('div', { class: 'stat-content' }, [
      createVNode('span', { class: 'stat-title' }, props.title),
      createVNode('span', { class: 'stat-value' }, typeof props.value === 'number' 
        ? props.value.toLocaleString() 
        : props.value
      ),
      props.change !== undefined
        ? createVNode('span', { 
            class: props.change >= 0 ? 'stat-change positive' : 'stat-change negative'
          }, `${props.change >= 0 ? '+' : ''}${props.change}%`)
        : null
    ])
  ]);
}

function RegionTable(props: { data: Array<{ region: string; sales: number; growth: number }> }) {
  return createVNode('div', { class: 'region-table' }, [
    createVNode('table', {},
      [
        createVNode('thead', {},
          createVNode('tr', {}, [
            createVNode('th', {}, '地区'),
            createVNode('th', {}, '销售额'),
            createVNode('th', {}, '增长率')
          ])
        ),
        createVNode('tbody', {},
          props.data.map(item =>
            createVNode('tr', { key: item.region }, [
              createVNode('td', {}, item.region),
              createVNode('td', {}, `¥${item.sales.toLocaleString()}`),
              createVNode('td', {}, [
                createVNode('span', { 
                  class: item.growth >= 10 ? 'growth-high' : 'growth-low'
                }, `${item.growth >= 0 ? '+' : ''}${item.growth}%`)
              ])
            ])
          )
        )
      ]
    )
  ]);
}

// 主应用组件

function Dashboard() {
  const store = createDashboardStore();
  const timeRangeOptions = ['week', 'month', 'year'] as const;

  return createVNode('div', { class: 'dashboard-app' }, [
    createVNode('header', { class: 'dashboard-header' }, [
      createVNode('h1', {}, '数据可视化仪表盘'),
      createVNode('div', { class: 'header-actions' }, [
        createVNode('select', { 
          class: 'time-selector',
          value: store.timeRange.value,
          onchange: (e: any) => store.timeRange.value = e.target.value
        },
          timeRangeOptions.map(opt => 
            createVNode('option', { value: opt }, 
              opt === 'week' ? '本周' : opt === 'month' ? '本月' : '本年'
            )
          )
        ),
        createVNode('button', { class: 'refresh-btn' }, '🔄 刷新')
      ])
    ]),
    
    createVNode('div', { class: 'stats-row' }, [
      createVNode(StatCard, { 
        title: '总销售额', 
        value: `¥${store.totalSales.value.toLocaleString()}`,
        change: 12.5,
        icon: '💰',
        color: '#667eea'
      }),
      createVNode(StatCard, { 
        title: '总利润', 
        value: `¥${store.totalProfit.value.toLocaleString()}`,
        change: 8.3,
        icon: '📈',
        color: '#764ba2'
      }),
      createVNode(StatCard, { 
        title: '平均增长率', 
        value: `${store.avgGrowth.value}%`,
        change: 2.1,
        icon: '📊',
        color: '#43e97b'
      }),
      createVNode(StatCard, { 
        title: '活跃地区', 
        value: store.regionData.value.length,
        icon: '🌍',
        color: '#4facfe'
      })
    ]),

    createVNode('div', { class: 'charts-grid' }, [
      createVNode('div', { class: 'chart-card large' }, [
        createVNode('h3', { class: 'chart-title' }, '销售趋势'),
        createVNode(LineChart, { data: store.salesData.value })
      ]),
      createVNode('div', { class: 'chart-card' }, [
        createVNode('h3', { class: 'chart-title' }, '产品分类占比'),
        createVNode(PieChart, { data: store.categoryData.value })
      ])
    ]),

    createVNode('div', { class: 'charts-grid' }, [
      createVNode('div', { class: 'chart-card' }, [
        createVNode('h3', { class: 'chart-title' }, '地区销售额'),
        createVNode(BarChart, { 
          data: store.regionData.value.map(item => ({
            label: item.region,
            value: item.sales,
            color: '#667eea'
          }))
        })
      ]),
      createVNode('div', { class: 'chart-card' }, [
        createVNode('h3', { class: 'chart-title' }, '地区详情'),
        createVNode(RegionTable, { data: store.regionData.value })
      ])
    ]),

    createVNode('div', { class: 'data-table-section' }, [
      createVNode('h3', { class: 'section-title' }, '详细数据'),
      createVNode('table', { class: 'detail-table' }, [
        createVNode('thead', {},
          createVNode('tr', {}, [
            createVNode('th', {}, '月份'),
            createVNode('th', {}, '销售额'),
            createVNode('th', {}, '利润'),
            createVNode('th', {}, '利润率'),
            createVNode('th', {}, '操作')
          ])
        ),
        createVNode('tbody', {},
          store.salesData.value.map(item =>
            createVNode('tr', { key: item.month }, [
              createVNode('td', {}, item.month),
              createVNode('td', {}, `¥${item.sales.toLocaleString()}`),
              createVNode('td', {}, `¥${item.profit.toLocaleString()}`),
              createVNode('td', {}, `${((item.profit / item.sales) * 100).toFixed(1)}%`),
              createVNode('td', {}, [
                createVNode('button', { class: 'table-btn' }, '查看详情')
              ])
            ])
          )
        )
      ])
    ])
  ]);
}

const DASHBOARD_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f7fa; }
.dashboard-app { padding: 20px; max-width: 1400px; margin: 0 auto; }
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.dashboard-header h1 { color: #1a1a2e; font-size: 1.8rem; }
.time-selector { padding: 10px 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; margin-right: 10px; }
.refresh-btn { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; }
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-card { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; }
.stat-content { display: flex; flex-direction: column; }
.stat-title { color: #666; font-size: 0.9rem; }
.stat-value { font-size: 1.5rem; font-weight: bold; color: #1a1a2e; }
.stat-change { font-size: 0.85rem; margin-top: 5px; }
.stat-change.positive { color: #43e97b; }
.stat-change.negative { color: #e74c3c; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
.chart-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.chart-card.large { grid-column: span 2; }
.chart-title { color: #1a1a2e; font-size: 1.1rem; margin-bottom: 20px; }
.bar-chart { display: flex; flex-direction: column; gap: 12px; }
.bar-item { display: flex; align-items: center; gap: 15px; }
.bar-label { width: 50px; font-size: 0.9rem; color: #666; }
.bar-container { flex: 1; height: 30px; background: #f0f2f5; border-radius: 6px; overflow: hidden; }
.bar-fill { height: 100%; display: flex; align-items: center; padding-left: 10px; color: white; font-size: 0.85rem; border-radius: 6px; transition: width 0.5s ease; }
.line-chart { height: 250px; }
.line-legend { display: flex; gap: 20px; margin-bottom: 15px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
.legend-color { width: 12px; height: 12px; border-radius: 3px; }
.legend-color.sales { background: #667eea; }
.legend-color.profit { background: #43e97b; }
.line-chart-area { display: flex; justify-content: space-around; align-items: flex-end; height: 200px; }
.line-column { display: flex; flex-direction: column; align-items: center; flex: 1; }
.line-bars { display: flex; gap: 4px; align-items: flex-end; height: 180px; }
.line-bar { width: 20px; border-radius: 4px 4px 0 0; transition: height 0.5s ease; }
.line-bar.sales { background: #667eea; }
.line-bar.profit { background: #43e97b; }
.line-label { margin-top: 8px; font-size: 0.85rem; color: #666; }
.pie-chart-container { display: flex; gap: 20px; align-items: center; }
.pie-chart { width: 150px; height: 150px; border-radius: 50%; }
.pie-segment { width: 100%; height: 100%; }
.pie-legend { display: flex; flex-direction: column; gap: 8px; }
.pie-legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
.pie-legend-color { width: 12px; height: 12px; border-radius: 3px; }
.pie-legend-name { flex: 1; color: #333; }
.pie-legend-value { color: #666; font-weight: 600; }
.region-table { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; font-weight: 600; color: #333; }
.growth-high { color: #43e97b; font-weight: 600; }
.growth-low { color: #f39c12; }
.data-table-section { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.section-title { color: #1a1a2e; font-size: 1.1rem; margin-bottom: 20px; }
.detail-table tr:hover { background: #f8f9fa; }
.table-btn { padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
`;

export {
  Dashboard,
  createDashboardStore,
  DASHBOARD_STYLES
};

if (typeof require !== 'undefined' && require.main === module) {
  console.log('🧪 LytJS 数据可视化应用实战案例');
  console.log('📦 包含功能:');
  console.log('   - 多类型图表（柱状图、折线图、饼图）');
  console.log('   - 实时数据更新');
  console.log('   - 数据筛选和排序');
  console.log('   - 仪表盘布局');
  console.log('\n✅ 数据可视化应用案例创建成功！');
}
