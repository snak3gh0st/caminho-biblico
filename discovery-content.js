const passageJourneys = {
  'joao-4': {
    title:['Jesus e a mulher samaritana','Jesus and the Samaritan woman'],
    question:['Por que uma conversa sobre água vira uma conversa sobre adoração?','Why does a conversation about water become a conversation about worship?'],
    image:'passage-43-4-7-26.webp',
    steps:[['Leia o diálogo','Read the dialogue'],['Veja o lugar','See the place'],['Siga a conexão','Follow the connection'],['Guarde a descoberta','Save the discovery']],
    refs:[[43,4,7,26],[43,7,37,39]]
  },
  'quatro-evangelhos': {
    title:['Os pães nos quatro Evangelhos','The loaves in the four Gospels'],
    question:['O que cada Evangelho destaca ao contar a mesma cena?','What does each Gospel bring forward when telling the same story?'],
    image:'passage-43-6-1-15.webp',
    steps:[['Compare os relatos','Compare the accounts'],['Guarde a descoberta','Save the discovery']],
    refs:[[40,14,13,21],[41,6,30,44],[42,9,10,17],[43,6,1,15]]
  },
  'alianca': {
    title:['Aliança através da Bíblia','Covenant across the Bible'],
    question:['Como as promessas e as responsabilidades da aliança aparecem em épocas diferentes?','How do covenant promises and responsibilities appear across different periods?'],
    image:'exodus.jpg',
    refs:[[1,15,1,6],[2,19,1,8],[24,31,31,34],[42,22,14,20]],
    sections:[
      {title:['A promessa a Abraão','The promise to Abraham'],text:['Abrão pergunta quem será seu herdeiro. Deus lhe promete descendência e o leva a olhar o céu. Observe como o texto descreve a resposta de Abrão.','Abram asks who will inherit from him. God promises descendants and takes him outside to look at the sky. Notice how the passage describes Abram’s response.']},
      {title:['O povo no Sinai','The people at Sinai'],text:['A fala de Deus começa lembrando a saída do Egito. Agora o convite à aliança é dirigido ao povo reunido. Observe o que já aconteceu quando a resposta do povo é pedida.','God’s speech begins by recalling the departure from Egypt. Now the covenant invitation addresses the gathered people. Notice what has already happened by the time they are asked to respond.']},
      {title:['Uma nova aliança em Jeremias','A new covenant in Jeremiah'],text:['Jeremias anuncia uma nova aliança à casa de Israel e à casa de Judá. A lei escrita no coração e o perdão ocupam o centro da promessa.','Jeremiah announces a new covenant with the houses of Israel and Judah. The law written on the heart and the promise of forgiveness are central.']},
      {title:['O cálice na última ceia','The cup at the Last Supper'],text:['Jesus chama o cálice de nova aliança em seu sangue. Releia Jeremias e observe qual expressão reaparece na fala de Jesus e em que cenário ela é usada.','Jesus calls the cup the new covenant in his blood. Revisit Jeremiah and notice which expression appears again in Jesus’s words and in what setting.']}
    ]
  },
  'por-que-quatro': {
    title:['Por que há quatro Evangelhos?','Why are there four Gospels?'],
    question:['Como quatro relatos ajudam a entender Jesus?','How do four accounts help us understand Jesus?'],
    keywords:[['quatro evangelhos','4 evangelhos','diferenca entre os evangelhos','diferentes evangelhos'],['four gospels','4 gospels','gospels different','difference between the gospels']],
    refs:[[42,1,1,4],[43,20,30,31]],
    sections:[
      {title:['Leia o que Lucas diz sobre seu trabalho','Read what Luke says about his work'],text:['Lucas menciona narrativas anteriores, testemunhas e a decisão de escrever um relato ordenado para Teófilo. Sua abertura ajuda a perceber o propósito de um Evangelho.','Luke mentions earlier narratives, eyewitnesses, and his decision to write an orderly account for Theophilus. His opening helps you notice the purpose of a Gospel.']},
      {title:['Veja o que João diz sobre sua seleção','See what John says about his selection'],text:['João diz que escolheu alguns sinais para conduzir o leitor à fé em Jesus. Comece por essas duas declarações e depois compare a cena dos pães: o que cada narrador inclui?','John says he chose certain signs so the reader might believe in Jesus. Start with these two statements and then compare the story of the loaves. What does each narrator include?']}
    ]
  },
  'como-ler-salmo': {
    title:['Como leio um salmo?','How do I read a psalm?'],
    question:['Quem fala, que imagens usa e o que muda até o fim?','Who speaks, what images do they use, and what changes by the end?'],
    keywords:[['como ler um salmo','como leio um salmo','ler salmos','ler o salmo','entender um salmo','poesia dos salmos'],['read a psalm','read psalms','understand a psalm','psalm poetry']],
    refs:[[19,23,1,6],[19,13,1,6]],
    sections:[
      {title:['Observe a imagem e a voz','Notice the image and the voice'],text:['No Salmo 23, siga a figura do pastor. Repare na passagem de falar sobre Deus para falar diretamente com ele no vale.','In Psalm 23, follow the image of the shepherd. Notice the shift from speaking about God to speaking directly to God in the valley.']},
      {title:['Acompanhe o movimento da oração','Follow the movement of the prayer'],text:['No Salmo 13, marque as perguntas “até quando?”, o pedido e as palavras finais de confiança. Leia em voz alta para perceber como o tom muda.','In Psalm 13, mark the “how long?” questions, the request, and the closing words of trust. Read aloud to hear how the tone changes.']}
    ]
  }
};

const dialogueMoments = [
  {ref:[43,4,7,9],title:['O pedido de água','The request for water'],text:['Jesus pede água. A mulher chama a atenção para quem está fazendo o pedido e a quem ele é dirigido.','Jesus asks for water. The woman draws attention to who is asking and whom he is addressing.']},
  {ref:[43,4,10,15],title:['A água viva','Living water'],text:['Jesus introduz a imagem da água viva. Observe como a mulher ainda fala da água que precisa tirar do poço.','Jesus introduces the image of living water. Notice how the woman still speaks of water she needs to draw from the well.']},
  {ref:[43,4,16,26],title:['O lugar de adoração','The place of worship'],text:['A mulher identifica Jesus como profeta e pergunta pelo lugar de adoração. Observe como ele responde à pergunta sobre o monte.','The woman identifies Jesus as a prophet and raises the question of where to worship. Notice how he responds to her question about the mountain.']}
];

const gospelObservations = [
  {title:['Como começa o relato?','How does the account begin?'], evidence:[14,34,11,2], notes:[
    ['Jesus sente compaixão e cura os enfermos.','Jesus has compassion and heals the sick.'],
    ['Jesus vê pessoas como ovelhas sem pastor e começa a ensinar.','Jesus sees people like sheep without a shepherd and begins to teach.'],
    ['Jesus acolhe a multidão, fala do Reino e cura.','Jesus welcomes the crowd, speaks about the Kingdom, and heals.'],
    ['A multidão segue Jesus por causa dos sinais feitos nos enfermos.','The crowd follows Jesus because of the signs done for the sick.']
  ]},
  {title:['De onde vêm os pães?','Where do the loaves come from?'], evidence:[17,38,13,9], notes:[
    ['Os discípulos dizem que têm cinco pães e dois peixes.','The disciples say they have five loaves and two fish.'],
    ['Jesus manda verificar quantos pães há. Os discípulos voltam com a contagem.','Jesus asks them to find out how many loaves they have. The disciples return with the count.'],
    ['Os discípulos dizem o que têm e consideram a possibilidade de comprar comida.','The disciples say what they have and consider buying food.'],
    ['André menciona um menino com cinco pães de cevada e dois peixinhos.','Andrew mentions a boy with five barley loaves and two small fish.']
  ]},
  {title:['O que sobra no fim?','What is left at the end?'], evidence:[20,43,17,13], notes:[
    ['Todos comem, e são recolhidos doze cestos de pedaços.','Everyone eats, and twelve baskets of pieces are collected.'],
    ['Marcos menciona pedaços de pão e também dos peixes.','Mark mentions pieces of bread and also some fish.'],
    ['Lucas diz que todos ficam satisfeitos e que sobram doze cestos.','Luke says everyone is satisfied and twelve baskets are left.'],
    ['João especifica que os pedaços recolhidos eram dos cinco pães de cevada.','John specifies that the pieces collected are from the five barley loaves.']
  ]}
];

const journeyPlaces = {
  beginnings:[],
  ancestors:['hebron_551','shechem_1069','egypt_362'],
  exodus:['egypt_362','sinai_1098'],
  kingdom:['jerusalem_636','samaria_1022'],
  exile:['jerusalem_636','babylon_151'],
  jesus:['galilee_433','jerusalem_636'],
  church:['jerusalem_636','damascus_322','rome_1013']
};

const exileReadings = [
  {ref:[12,25,8,12],title:['A queda de Jerusalém','The fall of Jerusalem'],text:['Reis narra a destruição e a deportação.','Kings narrates the destruction and deportation.']},
  {ref:[25,1,1,5],title:['A voz do lamento','The voice of lament'],text:['Lamentações dá voz à cidade em forma de poesia.','Lamentations gives the city a voice through poetry.']},
  {ref:[24,29,4,14],title:['A carta aos exilados','The letter to the exiles'],text:['Jeremias escreve a quem já vive na Babilônia.','Jeremiah writes to people already living in Babylon.']},
  {ref:[15,1,1,5],title:['O início do retorno','The beginning of the return'],text:['Esdras narra o decreto que permite o retorno.','Ezra recounts the decree allowing the return.']}
];
