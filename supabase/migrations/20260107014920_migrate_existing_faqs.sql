-- Migration: Migrar FAQs existentes para o banco
-- Created: 06/01/2026
-- Author: Kiro AI

-- Migrar FAQs atuais para o banco
INSERT INTO faqs (question, answer, display_order, is_active) VALUES
('Colchão magnético realmente funciona para dores?', 'Sim. A magnetoterapia é reconhecida pela OMS e diversos estudos científicos comprovam sua eficácia no alívio de dores crônicas, melhora da circulação sanguínea e redução de inflamações. Nosso colchão possui 240 ímãs de 800 Gauss que geram um campo magnético terapêutico durante o sono.', 1, true),
('Quanto tempo leva para sentir os benefícios?', 'Os primeiros benefícios podem ser sentidos já nas primeiras noites, como melhora na qualidade do sono. Para dores crônicas e problemas circulatórios, recomendamos uso contínuo por 30 a 60 dias para resultados mais significativos.', 2, true),
('O colchão magnético tem contraindicações?', 'Sim. Não recomendamos para pessoas com marcapasso, bombas de insulina, próteses metálicas recentes, gestantes ou crianças menores de 12 anos. Sempre consulte seu médico antes de usar terapias magnéticas.', 3, true),
('Qual a diferença entre colchão magnético e ortopédico comum?', 'O colchão ortopédico comum oferece apenas suporte postural. Nosso colchão magnético combina 8 tecnologias: magnetoterapia, infravermelho longo, vibromassagem, energia bioquântica, densidade progressiva, cromoterapia, perfilado high-tech e tratamento sanitário.', 4, true),
('Como funciona a garantia e entrega?', 'Oferecemos garantia de 10 anos contra defeitos de fabricação e 30 dias para teste em casa. A entrega é feita em todo Brasil via transportadora especializada, com prazo de 7 a 15 dias úteis dependendo da região.', 5, true),
('Posso usar o colchão magnético se tenho fibromialgia?', 'Muitos clientes com fibromialgia relatam melhora significativa nas dores e qualidade do sono. A magnetoterapia ajuda a reduzir a inflamação e melhorar a circulação, beneficiando os sintomas da fibromialgia. Recomendamos consultar seu reumatologista.', 6, true),
('O colchão magnético ajuda com insônia?', 'Sim. O infravermelho longo e a magnetoterapia promovem relaxamento profundo, reduzem o estresse e equilibram o sistema nervoso, facilitando o adormecer e proporcionando sono mais reparador.', 7, true),
('Qual tamanho escolher para meu quarto?', 'Oferecemos 4 tamanhos: Solteiro (88x188cm), Padrão/Casal (138x188cm), Queen (158x198cm) e King (193x203cm). O mais vendido é o Padrão. Considere o espaço do quarto e se dormem 1 ou 2 pessoas.', 8, true);;
