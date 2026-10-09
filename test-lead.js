fetch('http://localhost:3000/api/webhooks/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenant_id: '30400105-391a-4f4c-ae82-3daf69b70093',
    nome: 'João Silva (Lead de Teste)',
    email: 'joao.silva@exemplo.com',
    telefone: '912345678',
    origem: 'Simulador Local'
  })
})
.then(res => res.json())
.then(data => console.log('Resposta do CRM:', data))
.catch(err => console.error('Erro:', err));