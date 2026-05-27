/**
 * Hand-curated list of snack recipes shown in the loading modal while the
 * recommendation fetch is in flight. Add or replace freely — the modal cycles
 * through this array (one recipe per fetch).
 *
 * Shape: `title` is the dish name, `description` is the 1–2-sentence hook,
 * `url` opens in a new tab when the user clicks "Ver receita".
 */

export type SnackRecipe = {
  readonly title: string;
  readonly description: string;
  readonly url: string;
};

export const SNACK_RECIPES: ReadonlyArray<SnackRecipe> = [
{
    title: "Palitos de queijo simples e crocantes",
    description:
      "Essa é uma receita fácil em que os legumes são cozidos, amassados, empanados e depois fritos. É uma ótima opção para os vegetarianos.",
    url: "https://www.receiteria.com.br/receita/palitos-de-queijo-simples-e-crocantes/",
  },
  {
    title: "Massinha frita",
    description:
      "Esse clássico é um petisco crocante e leva poucos ingredientes. Ele não possui recheio, mas pode ser servido com molhos salgados e doces no café da tarde.",
    url: "https://www.receiteria.com.br/receita/massinha-frita/",
  },
  {
    title: "Petisco de salsicha fácil",
    description:
      "Esse petisco é perfeito para preparar naquele domingão de tarde para tomar com uma cervejinha enquanto joga conversa fora com os amigos.",
    url: "https://www.receiteria.com.br/receita/petisco-de-salsicha-facil/",
  },
  {
    title: "Poutine tradicional",
    description:
      "O poutine tradicional é um prato canadense muito saboroso. Ele é feito com batata frita, molho gravy e queijo, sendo um petisco perfeito para a sexta-feira.",
    url: "https://www.receiteria.com.br/receita/poutine-tradicional/",
  },
  {
    title: "Bolinho de carne moída com queijo",
    description:
      "O bolinho de carne moída com queijo é perfeito para servir com maionese de ervas ou com geleia de pimenta, fica simplesmente delicioso.",
    url: "https://www.receiteria.com.br/receita/bolinho-de-carne-moida-com-queijo/",
  },
  {
    title: "Pastel de feira de carne moída",
    description:
      "A dica dessa receita é temperar bem a carne para que seus pastéis fiquem cheios de sabor. Você pode usar os indicados na descrição ou escolher os seus favoritos.",
    url: "https://www.receiteria.com.br/receita/pastel-de-feira-de-carne-moida/",
  },
  {
    title: "Iscas de peixe",
    description:
      "A isca de peixe é aquele aperitivo delicioso que a gente sempre pede no boteco. Agora, você vai aprender a receita para fazer em casa e se deliciar.",
    url: "https://www.receiteria.com.br/receita/iscas-de-peixe/",
  },
  {
    title: "Batata chips ondulada",
    description:
      "Apesar de ondulada, essa é uma receita que funciona também se cortada com o ralador tradicional. Conta com temperinhos que deixam seus sabores mais intensos.",
    url: "https://www.receiteria.com.br/receita/batata-chips-ondulada/",
  },
  {
    title: "Camarão frito",
    description:
      "Sinta o sabor e a brisa do mar ao saborear uma deliciosa porção de camarão frito igual ao da praia diretamente na sua casa.",
    url: "https://www.receiteria.com.br/receita/camarao-frito/",
  },
  {
    title: "Coxinha",
    description:
      "A coxinha é um salgado que tem o amor da grande maioria dos brasileiros. Que tal preparar esse petisco em casa recheado com frango?",
    url: "https://www.receiteria.com.br/receita/coxinha/",
  },
  {
    title: "Tulipa de frango frita",
    description:
      "Com uma finalização sequinha e crocante, graças a massinha que envolve os pedaços de frango! Uma tulipa que promete combinar com aquela cervejinha gelada.",
    url: "https://www.receiteria.com.br/receita/tulipa-de-frango-frita/",
  },
  {
    title: "Batata cozida e frita",
    description:
      "Para combinar com molhos simples, como maionese ou ketchup, ou ainda elaborar alguma opção mais elaborada, que tal essas batatas cozidas e fritas?",
    url: "https://www.receiteria.com.br/receita/batata-cozida-e-frita/",
  },
  {
    title: "Bolinho de bacalhau",
    description:
      "Já para os fãs de peixe, o bolinho de bacalhau pode cair muito bem. Como o peixe é o ingrediente principal, a massa não fica muito pesada.",
    url: "https://www.receiteria.com.br/receita/bolinho-de-bacalhau/",
  },
  {
    title: "Nachos caseiros",
    description:
      "Para servir com chilli, guacamole, coalhada ou molho de queijos, sua massa será resultado de uma mistura de farinha de milho com farinha de trigo.",
    url: "https://www.receiteria.com.br/receita/nachos-caseiros/",
  },
  {
    title: "Bolinho de chuva sequinho",
    description:
      "Com um preparo simples, é possível se deliciar com uma massa bem macia. Como essa é uma receita doce, você pode polvilhar canela nos bolinhos.",
    url: "https://www.receiteria.com.br/receita/bolinho-de-chuva-sequinho/",
  },
  {
    title: "Minipizza de berinjela",
    description:
      "Essa é uma pizza falsa, na verdade. Para substituir a massa, você vai precisar usar fatias de berinjela cobertas com molho de tomate e mussarela.",
    url: "https://www.receiteria.com.br/receita/minipizza-de-berinjela/",
  },
  {
    title: "Pipoca caramelizada",
    description:
      "Este petisco é um dos primeiros que vêm à mente para degustar assistindo TV. A calda de caramelo deixa a pipoca ainda mais saborosa.",
    url: "https://www.receiteria.com.br/receita/pipoca-caramelizada/",
  },
  {
    title: "Torrada com alho",
    description:
      "E que tal preparar algumas torradinhas para comer enquanto assiste a sua série favorita? O preparo é bem rapidinho e tem um sabor bem gostoso.",
    url: "https://www.receiteria.com.br/receita/torrada-com-alho/",
  },
  {
    title: "Pão de queijo muito fácil",
    description:
      "Pão de queijo é uma delícia. Conheça essa opção que leva polvilho azedo e queijo minas, ficando super crocante e rendendo bastante.",
    url: "https://www.receiteria.com.br/receita/pao-de-queijo-muito-facil/",
  },
  {
    title: "Ovos de codorna temperados",
    description:
      "Se você gosta de um petisco mais salgadinho, não deixe de conferir esses ovos de codornas temperados que ficam saborosos e perfeitos para maratonar.",
    url: "https://www.receiteria.com.br/receita/ovos-de-codorna-temperados/",
  },
  {
    title: "Kibe sem trigo",
    description:
      "Essa é uma receita de quibe que leva couve-flor, carne moída, hortelã e vários temperos, por isso o petisco fica supersaboroso e leve.",
    url: "https://www.receiteria.com.br/receita/kibe-sem-trigo/",
  },
  {
    title: "Muffin de frango com cream cheese",
    description:
      "O resultado é tão gostoso que vai ser difícil comer apenas uma unidade. A vantagem é que essa é uma opção super prática e rende bastante.",
    url: "https://www.receiteria.com.br/receita/muffin-de-frango-com-cream-cheese/",
  },
  {
    title: "Batata dorê",
    description:
      "O segredo é cozinhar até ficar macia, mas ainda firme, garantindo que ela doure bem na frigideira sem desmanchar.",
    url: "https://www.receiteria.com.br/receita/batata-dore/",
  },
  {
    title: "Pipoca no micro-ondas sem óleo",
    description:
      "Que a pipoca é um ingrediente saudável todo mundo sabe, mas ela pode ficar ainda melhor nessa versão sem óleo feita em minutos.",
    url: "https://www.receiteria.com.br/receita/pipoca-no-micro-ondas-sem-oleo/",
  },
  {
    title: "Chips de couve assado",
    description:
      "Com a couve, você consegue um petisco muito saudável e saboroso. Para um gostinho mais marcante, você pode usar seus temperos favoritos.",
    url: "https://www.receiteria.com.br/receita/chips-de-couve-assado/",
  }
];
