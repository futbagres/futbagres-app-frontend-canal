/**
 * Calcula a próxima ocorrência de um evento baseado no dia da semana
 * @param diaSemana - Número do dia da semana (0=Domingo, 6=Sábado)
 * @returns Data da próxima ocorrência no formato YYYY-MM-DD
 */
export function calcularProximaData(diaSemana: number): string {
  const hoje = new Date();
  const diaAtual = hoje.getDay();
  
  // Calcular quantos dias faltam para o próximo evento
  let diasAteEvento = diaSemana - diaAtual;
  
  // Se o dia já passou esta semana, pegar da próxima semana
  if (diasAteEvento <= 0) {
    diasAteEvento += 7;
  }
  
  // Criar a data do próximo evento
  const proximaData = new Date(hoje);
  proximaData.setDate(hoje.getDate() + diasAteEvento);
  
  return proximaData.toISOString().split('T')[0];
}

/**
 * Obtém a data do evento (para eventos únicos retorna a data_evento, 
 * para recorrentes calcula a próxima ocorrência)
 */
export function obterDataEvento(event: {
  recorrencia: 'unico' | 'semanal';
  data_evento: string | null;
  dia_semana: number | null;
}): string | null {
  if (event.recorrencia === 'unico') {
    return event.data_evento;
  }
  
  if (event.recorrencia === 'semanal' && event.dia_semana !== null) {
    return calcularProximaData(event.dia_semana);
  }
  
  return null;
}

/**
 * Formata uma data para exibição (ex: "15 de Janeiro de 2025")
 */
export function formatarData(dataString: string): string {
  const data = new Date(dataString + 'T00:00:00');
  
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const dia = data.getDate();
  const mes = meses[data.getMonth()];
  const ano = data.getFullYear();
  
  return `${dia} de ${mes} de ${ano}`;
}

/**
 * Formata uma data de forma curta (ex: "15/01/2025")
 */
export function formatarDataCurta(dataString: string): string {
  const data = new Date(dataString + 'T00:00:00');
  
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  
  return `${dia}/${mes}/${ano}`;
}

/**
 * Obtém o nome do dia da semana
 */
export function obterNomeDiaSemana(diaSemana: number): string {
  const dias = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  
  return dias[diaSemana] || '';
}

/**
 * Verifica se o evento já passou
 */
export function eventoPassou(dataString: string): boolean {
  const dataEvento = new Date(dataString + 'T23:59:59');
  const hoje = new Date();
  
  return dataEvento < hoje;
}

/**
 * Calcula quantos dias faltam para o evento
 */
export function diasAteEvento(dataString: string): number {
  const dataEvento = new Date(dataString + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const diffTime = dataEvento.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Retorna uma mensagem amigável sobre quando será o evento
 */
export function obterMensagemProximidade(dataString: string): string {
  const dias = diasAteEvento(dataString);
  
  if (dias < 0) return 'Evento passou';
  if (dias === 0) return 'Hoje!';
  if (dias === 1) return 'Amanhã';
  if (dias <= 7) return `Em ${dias} dias`;
  
  return formatarDataCurta(dataString);
}
