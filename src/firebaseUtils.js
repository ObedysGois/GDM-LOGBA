import { collection, addDoc, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc, where, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig.js';
import { uploadRouteImage as uploadRouteImageSupabase, uploadDeliveryAttachment, validateFileType, validateFileSize, uploadFileWithFallback } from './supabaseUtils.js';

// Lista atualizada de clientes com vendedor, rede e UF
export const clientData = {
  "Assai Paralela": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Rmix Alphaville": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Assai Pau Da Lima": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Rmix Imbui": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Gbarbosa Cd Bahia": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Cdp Armacao Stiep Loja 14": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Assai Vasco Da Gama": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Redemix Rio Vermelho": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Pitubinha": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Amazonas": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Masani": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Buraquinho": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Stella Maris": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Atakarejo Lauro de Freitas": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Trielo Ceasa BA": { vendedor: "Filial", rede: "Trielo", uf: "BA" },
  "Cdp Rodoviaria Loja 17": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Rmix Ondina": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Vitoria": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Horto": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Assai Calcada": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Cdp Sete Portas Loja 09": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Deli E Cia Graca": { vendedor: "Ricardo Santos", rede: "Deli E Cia", uf: "BA" },
  "Cdp Catu Loja 12": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Cdp Super Centro Mata Loja 10": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Cdp Alagoinhas Loja 11": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Cdp Centro Dias Davila": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Cdp Centro - Mata S.J. Sede": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Mateus Juazeiro": { vendedor: "Antonio", rede: "Mateus Lojas", uf: "BA" },
  "Assai Sr Do Bonfim": { vendedor: "Antonio", rede: "Assai", uf: "BA" },
  "Rf Supermercado Brasil": { vendedor: "Antonio", rede: "Outros", uf: "BA" },
  "Frutos Da Terra": { vendedor: "Antonio", rede: "Outros", uf: "PE" },
  "Feirao Das Frutas Atras Banca": { vendedor: "Antonio", rede: "Feirao Das Frutas", uf: "PE" },
  "Feirao Das Frutas Maria Auxiliadora": { vendedor: "Antonio", rede: "Feirao Das Frutas", uf: "PE" },
  "Assai Juazeiro": { vendedor: "Antonio", rede: "Assai", uf: "BA" },
  "Bontempo Supermercados": { vendedor: "Antonio", rede: "Outros", uf: "PE" },
  "Flor Da Chapada Itaberaba": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Sams Aracaju": { vendedor: "Vinicius", rede: "Sams", uf: "SE" },
  "G. Barbosa Francisco Porto": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Gbarbosa Hiper Sul": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "G. Barbosa - Rio Mar": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Supermercado Bombom Aracaju": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Atakarejo Patamares": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Rmix Ponto Verde Vila Laura": { vendedor: "Vinicius", rede: "Ponto Verde", uf: "BA" },
  "Sams Pituba": { vendedor: "Vinicius", rede: "Sams", uf: "BA" },
  "Assai Cabula": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Sams Bonoco": { vendedor: "Vinicius", rede: "Sams", uf: "BA" },
  "Assai Paripe": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Sams Lauro De Freitas": { vendedor: "Vinicius", rede: "Sams", uf: "BA" },
  "Assai Camacari": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Atakarejo Cd Simoes Filho": { vendedor: "Ricardo Santos", rede: "Atakarejo Cds", uf: "BA" },
  "Hiperideal Piata Orlando Gomes": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Patamares Lj23": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Piata Otavio Mangabeira": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Horto": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Atakarejo Vasco da Gama": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Hiperideal Jardins (Juracy Acm)": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Buraquinho": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Assai Barris": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Hiperideal Caminho Das Arvores": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Manoel Dias Pituba": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Itaigara": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Atacadão Camaçari": { vendedor: "Nixon", rede: "Atacadao", uf: "BA" },
  "Hiperideal Amazonas": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Perini Pituba": { vendedor: "Vinicius", rede: "Perini", uf: "BA" },
  "Hiperideal Pituba Rua Ceara": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Barra": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Canela": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal - Vitoria": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Perini Graca": { vendedor: "Vinicius", rede: "Perini", uf: "BA" },
  "Redemix Chame-Chame": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Atacadao Camacari": { vendedor: "Nixon", rede: "Atacadao", uf: "BA" },
  "Hiperideal Guarajuba": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Atakarejo Itacimirim": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Hiperideal Feira De Santana": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Atakarejo Feira De Santana": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Sams Feira De Santana": { vendedor: "Vinicius", rede: "Sams", uf: "BA" },
  "Atakarejo Ilheus": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Atakarejo Aracaju": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "SE" },
  "Mateus Jose Conrado Aracaju": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "SE" },
  "Mateus Santa Monica": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "SE" },
  "Assai Petrolina": { vendedor: "Antonio", rede: "Assai", uf: "PE" },
  "Mateus Cd - Feira De Santana": { vendedor: "Ricardo Santos", rede: "Mateus Cds", uf: "BA" },
  "Economart Feira De Santana": { vendedor: "Ricardo Santos", rede: "Economart", uf: "BA" },
  "Paris Delicatessen": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Atakarejo Boca Do Rio": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Hiperideal Praia Do Forte": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Parque Shopping": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Gbarbosa Jardins": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "G Barbosa Farolandia": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Hiper Carnes Barra Dos Coqueiros": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "HiperCarnes Jabotiana Aracaju": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Gran Hortifruti Pituba": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Assai Rotula": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "A. Cecilio Mota Jacobina": { vendedor: "Antonio", rede: "Cesta Do Povo", uf: "BA" },
  "Pga Juazeiro": { vendedor: "Antonio", rede: "Outros", uf: "BA" },
  "Gbarbosa 035 Costa Azul": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Gbarbosa-302 - Horto Bela Vista": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Supermercado Jhones Itaberaba": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Supermercado Jl Itaberaba": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Gbarbosa 108 Lauro De Freitas": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Atakarejo Ilha Itaparica": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Gbarbosa-274-Guarajuba": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Hiperideal Orla": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Armacao": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Gbarbosa 037 Alagoinhas": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Gbarbosa 015 Feira De Santana": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Hiperideal Stella Maris II": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Gbarbosa Luzia": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Gbarbosa Sao Cristovao": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Atakarejo Cd Vitoria Da Conquista": { vendedor: "Ricardo Santos", rede: "Atakarejo Cds", uf: "BA" },
  "Hiperideal Vila Laura": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Gbarbosa 029 Brotas": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Mercado Mel Aracaju": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Atakarejo Porto Seguro": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Atakarejo Vit Conquista": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Hiperideal Stella Maris I": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Gral Paniville Pituba": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Assai Mussurunga": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Gbarbosa 074 Sobradinho": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Hiperideal Jardim Apipema": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Hiperideal Patamares Lj13": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Atakarejo Alagoinhas": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Cdp Cd Monte Libano Mata S.J.": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Mercadinho Economico Petrolina": { vendedor: "Antonio", rede: "Super Economico", uf: "PE" },
  "Hiper Ideal Cd": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Roselly Ferreira": { vendedor: "Vinicius", rede: "Outros", uf: "BA" },
  "Gbarbosa Cd Sergipe": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Atakarejo Camacari": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Massimo Farolandia": { vendedor: "Vinicius", rede: "Massimo", uf: "SE" },
  "Atacadao Petrolina": { vendedor: "Antonio", rede: "Atacadao", uf: "PE" },
  "Economart Vitoria Da Conquista": { vendedor: "Ricardo Santos", rede: "Economart", uf: "BA" },
  "Atakarejo Simoes Filho Lj": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Perboni Petrolina": { vendedor: "Antonio", rede: "Outros", uf: "PE" },
  "Economart Jequie": { vendedor: "Ricardo Santos", rede: "Economart", uf: "BA" },
  "Massimo Luzia": { vendedor: "Vinicius", rede: "Massimo", uf: "SE" },
  "Gbarbosa 017 Feira De Santana": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Atakarejo Patamares II": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Dist Sao Roque Mangabeira": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Dist Sao Roque Sta Monica": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Sao Roque Artemia Pires": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Atakarejo Piata": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Atakarejo Iguatemi": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Gbarbosa 038 Alagoinhas": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Gbarbosa 076 Feira Tomba": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Atakarejo S. Goncalo Dos Campos": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Cdp Mata S. J. Premium": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Atakarejo Salvador": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Atakarejo Baixa De Quintas": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Cdp Ogunjá": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Cdp Marechal": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Le Delis Delicatessen": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Hiperideal Graca": { vendedor: "Ricardo Santos", rede: "Hiperideal", uf: "BA" },
  "Cdp Boca Do Rio Loja 07": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Exito Supermercado Lagarto": { vendedor: "Ricardo Santos", rede: "Outros", uf: "SE" },
  "Massimo - Barra dos Coqueiros": { vendedor: "Vinicius", rede: "Massimo", uf: "SE" },
  "Rmix Ponto Verde Sete Portas": { vendedor: "Vinicius", rede: "Ponto Verde", uf: "BA" },
  "Rmix Simoes Filho": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Itapua": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Assai Feira Sobradinho": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Assai Feira Tomba": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "Cdp Mata S. J. Lj 2": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Dist Sao Roque Sim": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Atakarejo Pernambues": { vendedor: "Ricardo Santos", rede: "Atakarejo Lojas", uf: "BA" },
  "Megga Distribuidora": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Dist Sao Roque Centro": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Dist Sao Roque Calumbi": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Dist Sao Roque Sto Estevao": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Assai Lauro De Freitas": { vendedor: "Nixon", rede: "Assai", uf: "BA" },
  "G Barbosa Hiper Norte": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Gbarbosa-133 -Juazeiro Centro": { vendedor: "Antonio", rede: "G Barbosa", uf: "BA" },
  "Gbarbosa-125-Juazeiro Sa Antonio": { vendedor: "Antonio", rede: "G Barbosa", uf: "BA" },
  "Rmix Ponto Verde Iapi": { vendedor: "Vinicius", rede: "Ponto Verde", uf: "BA" },
  "Rmix Coageli Lauro": { vendedor: "Vinicius", rede: "Redemix", uf: "BA" },
  "Rmix Cogeali Paripe": { vendedor: "Vinicius", rede: "Cogeali", uf: "BA" },
  "Total Atacado Lauro": { vendedor: "Vinicius", rede: "Total Atac", uf: "BA" },
  "Cdp Boca Do Rio Lj 01": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Gb CD N. Sra. Do Socorro": { vendedor: "Vinicius", rede: "G Barbosa", uf: "SE" },
  "Gb Feira de Santana II": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Cdp São Caetano": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Cdp Manoel Dia D'Avila Loja 04": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Trielo Paulista PE": { vendedor: "Filial", rede: "Trielo", uf: "PE" },
  "Gb Vit Conquista I": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Gb vit Conquista II": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "Gb Cabula": { vendedor: "Vinicius", rede: "G Barbosa", uf: "BA" },
  "MultiFrios Premium I": { vendedor: "Antonio", rede: "Outros", uf: "BA" },
  "MultiFrios Premium II": { vendedor: "Antonio", rede: "Outros", uf: "BA" },
  "Sao Roque Conceicao": { vendedor: "Ricardo Santos", rede: "Dist Sao Roque", uf: "BA" },
  "Mateus Petrolina": { vendedor: "Antonio", rede: "Mateus Lojas", uf: "PE" },
  "Cdp Castelo Branco": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Cbd Costa Azul": { vendedor: "Ricardo Santos", rede: "Pao de Acucar", uf: "BA" },
  "Mateus Jacobina": { vendedor: "Antonio", rede: "Mateus Lojas", uf: "BA" },
  "Mateus Conceicao Do Coite": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "BA" },
  "Mateus Vitoria Da Conquista": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "BA" },
  "Mateus Porto Seguro": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "BA" },
  "Compre Bem Alagoinhas I": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Mateus Gloria": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "SE" },
  "Mateus Eunapolis": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "BA" },
  "Mateus Itabuna": { vendedor: "Ricardo Santos", rede: "Mateus Lojas", uf: "BA" },
  "Carballo Alphaville": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Carballo Horto": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Economart Luis Eduardo": { vendedor: "Ricardo Santos", rede: "Economart", uf: "BA" },
  "Carballo Pituba": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Caravelas Supermercado": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Jns Comercio": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Jn Comercio": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Compre Bem Alagoinhas II": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "S N Soares E Cia": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Trielo CD Simoes Filho BA": { vendedor: "Filial", rede: "Trielo", uf: "BA" },
  "Assai Jose Conrado": { vendedor: "Nixon", rede: "Assai", uf: "SE" },
  "Assai Aeroporto": { vendedor: "Nixon", rede: "Assai", uf: "SE" },
  "Assai Inacio Barbosa": { vendedor: "Nixon", rede: "Assai", uf: "SE" },
  "Assai N. Sra. Socorro": { vendedor: "Nixon", rede: "Assai", uf: "SE" },
  "Cdp Alagoinhas I": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Super BomBom Estancia": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Nunes Peixoto Itabaiana": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Nunes Peixoto N. Sra Gloria": { vendedor: "Vinicius", rede: "Outros", uf: "SE" },
  "Mix Litoral": { vendedor: "Ricardo Santos", rede: "Outros", uf: "BA" },
  "Bompreço CD Palmares": { vendedor: "Vinicius", rede: "Bompreço", uf: "BA" },
  "Perini Vasco": { vendedor: "Vinicius", rede: "Perini", uf: "BA" },
  "Unimar Arembepe": { vendedor: "Nixon", rede: "Outros", uf: "BA" },
  "Unimar Barra Pojuca": { vendedor: "Nixon", rede: "Outros", uf: "BA" },
  "Atacadão Mares": { vendedor: "Nixon", rede: "Atacadao", uf: "BA" },
  "Compre Bem Alagoinhas III": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" },
  "Compre Bem Alagoinhas IV": { vendedor: "Ricardo Santos", rede: "Cesta Do Povo", uf: "BA" }
};

// Lista atualizada de fretistas
export const fretistas = [
  "Anderson", "Andre", "Claudemar", "Claudio", "Cristian", "Cristiano", "Daniel", "Danilo",
  "Deivison", "Edmilson","Edbaldo", "Eden", "Ednilson", "Elvis", "Fabio", "Galha", "Gildasio",
  "Gutemberg", "Jancleiton", "Joao Paulo", "Joir", "Josenilson", "Leandro", "Luiz", "Mauricio", "Magno", "Natal",
  "OUTRO", "Paulo Noel", "Real", "Ricardo", "Roque", "Sergio", "Thiago de Noel", "Tiago de Danilo",
  "Uanderson", "Weidineiton", "João", "Roberval", "Robson", "Borges", "Miguel", "Kelven"
];

// Lista atualizada de tipos de problemas
export const problemTypes = [
  "Nota com problema", "Diferença de preço", "Nota sem pedido", "Divergência de quantidade",
  "Erro de referência", "Sem xml", "Loja em inventario", "Loja sem promotor",
  "Produto sem pedido", "Em desacordo com o pedido", "Estoque cheio", "Erro de digitação",
  "Erro de cadastro", "Fora do horário de Recebimento", "Nota em tratamento", "Nota fora do coletor",
  "Demora do Recebimento", "Cliente", "Outros motivos"
];

// Lista de usuários administradores
export const adminEmails = [
  "colaboradordocemel@gmail.com",
  "jrobed10@gmail.com",
  "eujunio13@gmail.com",
  "adm.salvador@frutasdocemel.com.br",
  "usuariodocemel@gmail.com",
  "obedysg@gmail.com",
  "faturamentosalvador@frutasdocemel.com.br",
  "jessica.louvores@frutasdocemel.com.br"
];

// Function to add a new delivery record
export const addDeliveryRecord = async (recordData) => {
  try {
    // Organizar dados como tabela estruturada
    const now = new Date();
    const formattedData = {
      // Campos da tabela
      data: now.toLocaleDateString('pt-BR'), // Data formatada: DD/MM/YYYY
      cliente: recordData.client || '',
      fretista: recordData.driver || '',
      vendedor: recordData.vendedor || '',
      rede: recordData.rede || '',
      uf: recordData.uf || '',
      checkin: recordData.checkin_time ? new Date(recordData.checkin_time).toLocaleTimeString('pt-BR') : '',
      checkout: recordData.checkout_time ? new Date(recordData.checkout_time).toLocaleTimeString('pt-BR') : '',
      duracao: recordData.duration || '',
      status: recordData.status || '',
      tipoProblema: recordData.problem_type || '',
      informacoesAdicionais: recordData.information || '',
      
      // Campos técnicos
      userEmail: recordData.userEmail || '',
      checkin_time: recordData.checkin_time || '',
      checkout_time: recordData.checkout_time || '',
      duration: recordData.duration || '',
      information: recordData.information || '',
      problem_type: recordData.problem_type || '',
      attachments: recordData.attachments || [],
      being_monitored: recordData.being_monitored || false,
      
      // Timestamps para ordenação
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, "deliveries"), formattedData);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// Function to get latest delivery records
export const getLatestDeliveryRecords = async (numRecords = 10) => {
  try {
    const q = query(collection(db, "deliveries"), orderBy("timestamp", "desc"), limit(numRecords));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (e) {
    console.error("Error getting latest documents: ", e);
    throw e;
  }
};

// Function to get all delivery records (with optional filters later)
export const getAllDeliveryRecords = async () => {
  try {
    const q = query(collection(db, "deliveries"));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por timestamp no JavaScript
    records.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.checkin_time || 0);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.checkin_time || 0);
      return timestampB - timestampA; // Ordem decrescente (mais recente primeiro)
    });
    
    return records;
  } catch (e) {
    console.error("Error getting all documents: ", e);
    throw e;
  }
};

// Function to get delivery records with pagination
export const getDeliveryRecordsPaginated = async (page = 1, pageSize = 100) => {
  try {
    const allRecords = await getAllDeliveryRecords();
    
    // Calcular índices para paginação
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Obter registros da página atual
    const paginatedRecords = allRecords.slice(startIndex, endIndex);
    
    // Retornar registros e informações de paginação
    return {
      records: paginatedRecords,
      totalRecords: allRecords.length,
      currentPage: page,
      totalPages: Math.ceil(allRecords.length / pageSize),
      hasPrevious: page > 1,
      hasNext: endIndex < allRecords.length
    };
  } catch (e) {
    console.error("Error getting paginated documents: ", e);
    throw e;
  }
};

// Function to get delivery records by user email (simplified to avoid index issues)
export const getDeliveryRecordsByUser = async (userEmail) => {
  try {
    const q = query(collection(db, "deliveries"), where("userEmail", "==", userEmail));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por timestamp no JavaScript
    records.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.checkin_time || 0);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.checkin_time || 0);
      return timestampB - timestampA; // Ordem decrescente (mais recente primeiro)
    });
    
    return records;
  } catch (e) {
    console.error("Error getting user documents: ", e);
    throw e;
  }
};

// Function to get delivery records with filters
export const getDeliveryRecordsWithFilters = async (filters = {}) => {
  try {
    let q = query(collection(db, "deliveries"));
    
    // Aplicar filtros
    if (filters.client) {
      q = query(q, where("client", "==", filters.client));
    }
    if (filters.driver) {
      q = query(q, where("driver", "==", filters.driver));
    }
    if (filters.userEmail) {
      q = query(q, where("userEmail", "==", filters.userEmail));
    }
    if (filters.status) {
      q = query(q, where("status", "==", filters.status));
    }
    if (filters.problemType) {
      q = query(q, where("problemType", "==", filters.problemType));
    }
    if (filters.vendedor) {
      q = query(q, where("vendedor", "==", filters.vendedor));
    }
    if (filters.rede) {
      q = query(q, where("rede", "==", filters.rede));
    }
    if (filters.uf) {
      q = query(q, where("uf", "==", filters.uf));
    }
    if (filters.hasAttachments) {
      q = query(q, where("attachments", "!=", []));
    }
    
    // Não usar orderBy aqui para evitar problemas de índice
    // Vamos ordenar no JavaScript depois
    
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por timestamp no JavaScript
    records.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.checkin_time || 0);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.checkin_time || 0);
      return timestampB - timestampA; // Ordem decrescente (mais recente primeiro)
    });
    
    return records;
  } catch (e) {
    console.error("Error getting filtered documents: ", e);
    throw e;
  }
};

// Function to update a delivery record
export const updateDeliveryRecord = async (id, newData) => {
  try {
    const recordRef = doc(db, "deliveries", id);
    
    // Atualizar campos da tabela se necessário
    const updateData = { ...newData };
    
    // Se houver checkout_time, atualizar campos relacionados
    if (newData.checkout_time) {
      updateData.checkout = new Date(newData.checkout_time).toLocaleTimeString('pt-BR');
    }
    
    // Se houver duration, atualizar duracao
    if (newData.duration) {
      updateData.duracao = newData.duration;
    }
    
    // Se houver problem_type, atualizar tipoProblema
    if (newData.problem_type) {
      updateData.tipoProblema = newData.problem_type;
    }
    
    // Se houver status, atualizar status
    if (newData.status) {
      updateData.status = newData.status;
    }
    
    // Se houver information, atualizar informacoesAdicionais
    if (newData.information) {
      updateData.informacoesAdicionais = newData.information;
    }
    
    // Adicionar timestamp de atualização
    updateData.updatedAt = Timestamp.now();
    
    await updateDoc(recordRef, updateData);
    console.log("Document updated successfully");
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Function to delete a delivery record
export const deleteDeliveryRecord = async (id) => {
  try {
    await deleteDoc(doc(db, "deliveries", id));
    console.log("Document deleted successfully");
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};

// Function to get client data
export const getClientData = (clientName) => {
  return clientData[clientName] || { vendedor: "", rede: "", uf: "" };
};

// Function to check if user is admin
export const isAdmin = (email) => {
  return adminEmails.includes(email);
};

// Função para verificar se é colaborador
export const isCollaborator = (user) => {
  if (!user) return false;
  if (user.type) return user.type === 'colaborador';
  // fallback por e-mail se necessário
  return user.email && user.email.endsWith('@colaborador.com');
};

// Function to generate dummy data
export const generateDummyData = async (numRecords = 20) => {
  const clients = Object.keys(clientData);
  const userEmails = [
    "user1@example.com", "user2@example.com", "user3@example.com", "obedysteste@gmail.com"
  ];

  const statuses = ["Entrega finalizada", "Entrega devolvida", "Entrega em andamento"];

  for (let i = 0; i < numRecords; i++) {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const randomFretista = fretistas[Math.floor(Math.random() * fretistas.length)];
    const randomUserEmail = userEmails[Math.floor(Math.random() * userEmails.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const hasProblem = Math.random() < 0.3; // 30% chance of having a problem
    const randomProblem = hasProblem ? problemTypes[Math.floor(Math.random() * problemTypes.length)] : '';

    const randomDate = new Date(2023 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const checkinTime = new Date(randomDate.setHours(Math.floor(Math.random() * 8) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60))); // 8 AM to 4 PM
    let checkoutTime = null;
    let duration = '';

    if (randomStatus !== "Entrega em andamento") {
      checkoutTime = new Date(checkinTime.getTime() + (Math.floor(Math.random() * 120) + 15) * 60 * 1000); // 15 to 135 minutes later
      const diffMs = checkoutTime.getTime() - checkinTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      duration = `${diffMinutes} min`;
    }

    const clientInfo = getClientData(randomClient);

    const recordData = {
      userEmail: randomUserEmail,
      client: randomClient,
      driver: randomFretista,
      checkin_time: checkinTime.toISOString(),
      checkout_time: checkoutTime ? checkoutTime.toISOString() : '',
      duration: duration,
      information: hasProblem ? `Problema simulado: ${randomProblem}` : 'Entrega normal',
      problem_type: randomProblem,
      status: randomStatus,
      attachments: [],
      being_monitored: false,
      vendedor: clientInfo.vendedor,
      rede: clientInfo.rede,
      uf: clientInfo.uf
    };

    await addDeliveryRecord(recordData);
  }
  console.log(`${numRecords} dummy records generated and added to Firestore.`);
};

// === ROUTE IMAGEM MANAGEMENT ===

// Upload da imagem da rota (usando Supabase como principal, localStorage como fallback)
export const uploadRouteImage = async (file, userEmail) => {
  // Validar arquivo
  if (!validateFileType(file, ['image/*'])) {
    throw new Error('Tipo de arquivo não suportado. Use apenas imagens.');
  }
  
  if (!validateFileSize(file, 10)) { // 10MB para imagens
    throw new Error('Arquivo muito grande. Use imagens menores que 10MB.');
  }
  
  try {
    // Tentar Supabase primeiro
    const result = await uploadRouteImageSupabase(file, userEmail);
    
    // Salvar referência no Firestore também
    try {
      const routeImageData = {
        image_url: result.image_url,
        date: result.date,
        user_email: result.user_email,
        file_name: result.file_name,
        original_name: result.original_name,
        upload_time: Timestamp.now(),
        file_size: result.file_size,
        storage_provider: 'supabase'
      };
      
      const docRef = await addDoc(collection(db, 'route_images'), routeImageData);
      result.id = docRef.id;
    } catch (firestoreError) {
      console.warn('Erro ao salvar no Firestore, mas upload foi bem-sucedido:', firestoreError);
    }
    
    return result;
  } catch (error) {
    console.warn('Supabase não disponível, usando localStorage:', error.message);
    // Fallback para localStorage
    return uploadRouteImageToLocalStorage(file, userEmail);
  }
};

// Salvar imagem no localStorage (solução principal)
// Função para obter a data no fuso horário de Salvador, Bahia (UTC-3)
const getSalvadorDate = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
};

const uploadRouteImageToLocalStorage = async (file, userEmail) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const date = getSalvadorDate();
        const imageData = {
          id: `local_${Date.now()}`,
          image_url: e.target.result,
          date: date,
          user_email: userEmail,
          file_name: `local_${date}_${file.name}`,
          original_name: file.name,
          upload_time: Timestamp.now(),
          file_size: file.size,
          is_local: true,
          created_at: new Date().toISOString()
        };
        
        // Salvar no localStorage
        localStorage.setItem('current_route_image', JSON.stringify(imageData));
        
        // Limpar imagens antigas (manter apenas as últimas 5)
        cleanupOldLocalImages();
        
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Limpar imagens antigas do localStorage
const cleanupOldLocalImages = () => {
  try {
    const keys = Object.keys(localStorage);
    const imageKeys = keys.filter(key => key.startsWith('route_image_'));
    
    if (imageKeys.length > 5) {
      // Ordenar por data de criação e remover as mais antigas
      const sortedKeys = imageKeys.sort((a, b) => {
        const dataA = JSON.parse(localStorage.getItem(a) || '{}');
        const dataB = JSON.parse(localStorage.getItem(b) || '{}');
        return new Date(dataA.created_at) - new Date(dataB.created_at);
      });
      
      // Remover as mais antigas (exceto as 5 mais recentes)
      sortedKeys.slice(0, -5).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.warn('Erro ao limpar imagens antigas:', error);
  }
};

// Buscar a imagem da rota do dia atual
export const getCurrentRouteImage = async () => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Primeiro, verificar localStorage (solução principal)
  try {
    const localImage = localStorage.getItem('current_route_image');
    if (localImage) {
      const parsedImage = JSON.parse(localImage);
      if (parsedImage.date === date) {
        return parsedImage;
      }
    }
  } catch (error) {
    console.warn('Erro ao acessar localStorage:', error);
  }
  
  // Se não encontrar no localStorage, tentar Firebase (opcional)
  try {
    const q = query(
      collection(db, 'route_images'),
      where('date', '==', date),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Ordenar localmente para pegar o mais recente
      const docs = querySnapshot.docs.sort((a, b) => {
        const timeA = a.data().upload_time?.toMillis() || 0;
        const timeB = b.data().upload_time?.toMillis() || 0;
        return timeB - timeA;
      });
      
      const doc = docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
  } catch (error) {
    console.warn('Firebase não disponível para buscar imagem:', error.message);
  }
  
  return null;
};

// Buscar todas as imagens de rota
export const getAllRouteImages = async () => {
  try {
    const q = query(collection(db, 'route_images'));
    
    const querySnapshot = await getDocs(q);
    const routeImages = [];
    
    querySnapshot.forEach((doc) => {
      routeImages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordenar localmente por data de upload (mais recente primeiro)
    routeImages.sort((a, b) => {
      const timeA = a.upload_time?.toMillis() || 0;
      const timeB = b.upload_time?.toMillis() || 0;
      return timeB - timeA;
    });
    
    return routeImages;
  } catch (error) {
    console.error('Erro ao buscar imagens de rota:', error);
    throw error;
  }
};

// Excluir imagem da rota
export const deleteRouteImage = async (imageId, fileName) => {
  try {
    // Limpar localStorage (solução principal)
    localStorage.removeItem('current_route_image');
    
    // Se não for imagem local, tentar limpar Firebase também
    if (!imageId.startsWith('local_')) {
      try {
        // Excluir do Storage
        if (fileName && !fileName.startsWith('local_')) {
          const storageRef = ref(storage, fileName);
          await deleteObject(storageRef);
        }
        
        // Excluir do Firestore
        await deleteDoc(doc(db, 'route_images', imageId));
      } catch (firebaseError) {
        console.warn('Erro ao limpar Firebase, mas localStorage foi limpo:', firebaseError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir imagem da rota:', error);
    throw error;
  }
};

// Atualizar imagem da rota
export const updateRouteImage = async (imageId, newData) => {
  try {
    const docRef = doc(db, 'route_images', imageId);
    await updateDoc(docRef, {
      ...newData,
      updated_time: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar imagem da rota:', error);
    throw error;
  }
};

// === ANEXOS DE ENTREGA ===

// Função para recuperar anexos do localStorage
export const getAttachmentFromLocalStorage = async (localStorageKey) => {
  try {
    // Verificar se a chave existe no localStorage
    const base64Data = localStorage.getItem(localStorageKey);
    if (!base64Data) {
      console.error(`Anexo não encontrado no localStorage: ${localStorageKey}`);
      return null;
    }
    return base64Data;
  } catch (error) {
    console.error('Erro ao recuperar anexo do localStorage:', error);
    return null;
  }
};

// Upload de anexos para registros de entrega
export const uploadDeliveryAttachments = async (files, deliveryId, userEmail, driver, client) => {
  const attachments = [];
  for (const file of files) {
    try {
      // Validar arquivo
      if (!validateFileType(file, ['image/*'])) {
        console.warn(`Arquivo ${file.name} ignorado - tipo não suportado`);
        continue;
      }
      if (!validateFileSize(file, 10)) { // 10MB para imagens
        console.warn(`Arquivo ${file.name} ignorado - muito grande`);
        continue;
      }
      // Upload usando Supabase
      const attachment = await uploadDeliveryAttachment(file, deliveryId, userEmail, driver, client);
      
      // Para anexos locais (base64), armazenar no localStorage em vez de no Firestore
      if (attachment.is_local && attachment.file_url.startsWith('data:')) {
        // Armazenar no localStorage
        const localStorageKey = `attachment_${deliveryId}_${Date.now()}`;
        localStorage.setItem(localStorageKey, attachment.file_url);
        console.log('✅ Anexo salvo no localStorage com chave:', localStorageKey);
        
        // Remover o conteúdo base64 do objeto que será salvo no Firestore
        // e substituir por uma referência ao localStorage
        attachments.push({
          file_url: `localStorage://${localStorageKey}`,
          file_name: attachment.file_name,
          original_name: attachment.original_name,
          file_path: attachment.file_path,
          file_size: attachment.file_size,
          file_type: attachment.file_type,
          storage_provider: 'localStorage',
          upload_time: attachment.upload_time,
          is_local: true,
          local_storage_key: localStorageKey
        });
      } else {
        // Para anexos do Supabase, salvar normalmente
        attachments.push({
          file_url: attachment.file_url,
          file_name: attachment.file_name,
          original_name: attachment.original_name,
          file_path: attachment.file_path,
          file_size: attachment.file_size,
          file_type: attachment.file_type,
          storage_provider: attachment.storage_provider,
          upload_time: attachment.upload_time,
          is_local: attachment.is_local || false
        });
      }
    } catch (error) {
      console.error(`Erro ao fazer upload do anexo ${file.name}:`, error);
      // Fallback para localStorage
      try {
        const base64Data = await fileToBase64(file);
        
        // Armazenar no localStorage
        const localStorageKey = `attachment_${deliveryId}_${Date.now()}`;
        localStorage.setItem(localStorageKey, base64Data);
        
        // Adicionar apenas metadados e referência ao localStorage
        const localAttachment = {
          file_url: `localStorage://${localStorageKey}`,
          file_name: `local_${file.name}`,
          original_name: file.name,
          file_path: `local/${file.name}`,
          file_size: file.size,
          file_type: file.type,
          storage_provider: 'localStorage',
          upload_time: new Date().toISOString(),
          is_local: true,
          local_storage_key: localStorageKey
        };
        attachments.push(localAttachment);
      } catch (localError) {
        console.error(`Erro no fallback para ${file.name}:`, localError);
      }
    }
  }
  return attachments;
};

// Função auxiliar para converter arquivo para base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Função para processar anexo do localStorage
export const processAttachmentFromLocalStorage = (attachment) => {
  if (!attachment || !attachment.is_local) return attachment;
  
  // Se o anexo tem uma referência ao localStorage
  if (attachment.file_url && attachment.file_url.startsWith('localStorage://')) {
    const localStorageKey = attachment.file_url.replace('localStorage://', '');
    const base64Data = localStorage.getItem(localStorageKey);
    
    if (base64Data) {
      // Retornar uma cópia do anexo com o conteúdo base64
      return {
        ...attachment,
        file_url: base64Data
      };
    }
  }
  
  // Se não encontrou no localStorage ou não é um anexo local, retornar o original
  return attachment;
};

// === LOCALIZAÇÃO EM TEMPO REAL ===

/**
 * Salva ou atualiza a localização do usuário logado na collection 'user_locations'.
 * @param {Object} locationData - { user_email, user_name, latitude, longitude, is_online }
 */
export const saveUserLocation = async (locationData) => {
  try {
    if (!locationData.user_email) throw new Error('Email do usuário é obrigatório');
    const q = query(collection(db, 'user_locations'), where('user_email', '==', locationData.user_email));
    const querySnapshot = await getDocs(q);
    let docId = null;
    if (!querySnapshot.empty) {
      docId = querySnapshot.docs[0].id;
    }
    const data = {
      ...locationData,
      last_update: new Date().toISOString(),
    };
    if (docId) {
      await updateDoc(doc(db, 'user_locations', docId), data);
    } else {
      await addDoc(collection(db, 'user_locations'), data);
    }
    return true;
  } catch (e) {
    console.error('Erro ao salvar localização do usuário:', e);
    return false;
  }
};

/**
 * Busca todas as localizações dos fretistas online (is_online = true).
 * @returns {Promise<Array>} Array de localizações
 */
export const getOnlineUserLocations = async () => {
  try {
    const q = query(collection(db, 'user_locations'), where('is_online', '==', true));
    const querySnapshot = await getDocs(q);
    const locations = [];
    querySnapshot.forEach((doc) => {
      locations.push({ id: doc.id, ...doc.data() });
    });
    return locations;
  } catch (e) {
    console.error('Erro ao buscar localizações online:', e);
    return [];
  }
};

// === USUÁRIOS FIRESTORE ===

/**
 * Lista todos os usuários cadastrados na coleção 'users'.
 * @returns {Promise<Array>} Array de usuários
 */
export const getAllUsers = async () => {
  const q = query(collection(db, 'users'));
  const querySnapshot = await getDocs(q);
  const users = [];
  querySnapshot.forEach((doc) => {
    users.push({ id: doc.id, ...doc.data() });
  });
  return users;
};

/**
 * Atualiza o tipo de usuário (admin, colaborador, fretista)
 * @param {string} userId - ID do documento do usuário
 * @param {string} newType - Novo tipo de usuário
 */
export const updateUserType = async (userId, newType) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { 
      type: newType,
      updatedAt: Timestamp.now()
    });
    console.log('Tipo de usuário atualizado com sucesso:', userId, '->', newType);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar tipo de usuário:', error);
    throw error;
  }
};

/**
 * Exclui um usuário da coleção 'users'
 * @param {string} userId - ID do documento do usuário
 */
export const deleteUser = async (userId) => {
  await deleteDoc(doc(db, 'users', userId));
};

/**
 * Adiciona um novo usuário na coleção 'users'
 * @param {Object} userData - Dados do usuário (email, type, nome, etc)
 */
export const addUser = async (userData) => {
  await addDoc(collection(db, 'users'), userData);
};

/**
 * Registra um acesso de login na coleção 'user_access_logs'
 * @param {string} email - E-mail do usuário
 */
export const logUserAccess = async (email) => {
  const now = new Date();
  await addDoc(collection(db, 'user_access_logs'), {
    email,
    date: now.toLocaleDateString('pt-BR'),
    time: now.toLocaleTimeString('pt-BR'),
    timestamp: Timestamp.now(),
  });
};

/**
 * Adiciona um comentário a um registro de entrega
 * @param {string} recordId - ID do registro
 * @param {string} comment - Comentário a ser adicionado
 * @param {string} userEmail - Email do usuário que fez o comentário
 * @param {string} userName - Nome do usuário que fez o comentário
 */
export const addDeliveryComment = async (recordId, comment, userEmail, userName) => {
  try {
    const commentData = {
      comment: comment,
      userEmail: userEmail,
      userName: userName,
      timestamp: Timestamp.now()
    };

    const recordRef = doc(db, 'deliveries', recordId);
    const recordDoc = await getDoc(recordRef);
    
    if (recordDoc.exists()) {
      const currentData = recordDoc.data();
      const comments = currentData.comments || [];
      comments.push(commentData);
      
      await updateDoc(recordRef, {
        comments: comments,
        lastUpdated: Timestamp.now()
      });
      
      console.log('Comentário adicionado com sucesso:', recordId);
      return true;
    } else {
      throw new Error('Registro não encontrado');
    }
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    throw error;
  }
};
