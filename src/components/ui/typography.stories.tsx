import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import {
  Blockquote,
  H1,
  H2,
  H3,
  H4,
  InlineCode,
  Large,
  Lead,
  List,
  Muted,
  P,
  Small,
  Table,
} from "@/components/ui/typography";

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const H1Story: Story = {
  name: "H1",
  render: () => <H1>Imposto sobre o Riso: Crônicas do Imposto das Piadas</H1>,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 1,
        name: /imposto sobre o riso/i,
      }),
    ).toBeInTheDocument();
  },
};

export const H2Story: Story = {
  name: "H2",
  render: () => <H2>O Povo do Reino</H2>,
};

export const H3Story: Story = {
  name: "H3",
  render: () => <H3>O Imposto das Piadas</H3>,
};

export const H4Story: Story = {
  name: "H4",
  render: () => <H4>As pessoas pararam de contar piadas</H4>,
};

export const PStory: Story = {
  name: "P",
  render: () => <P>O rei percebeu o erro e revogou o imposto das piadas.</P>,
};

export const LeadStory: Story = {
  name: "Lead",
  render: () => (
    <Lead>
      Um diálogo modal que interrompe o usuário com conteúdo importante.
    </Lead>
  ),
};

export const LargeStory: Story = {
  name: "Large",
  render: () => <Large>Você tem certeza absoluta?</Large>,
};

export const SmallStory: Story = {
  name: "Small",
  render: () => <Small>Endereço de e-mail</Small>,
};

export const MutedStory: Story = {
  name: "Muted",
  render: () => <Muted>Digite seu endereço de e-mail.</Muted>,
};

export const InlineCodeStory: Story = {
  name: "InlineCode",
  render: () => <InlineCode>@radix-ui/react-alert-dialog</InlineCode>,
};

export const BlockquoteStory: Story = {
  name: "Blockquote",
  render: () => (
    <Blockquote>Afinal, todo mundo gosta de uma boa piada.</Blockquote>
  ),
};

export const ListStory: Story = {
  name: "List",
  render: () => (
    <List>
      <List.Item>1º nível de trocadilhos: 5 moedas de ouro</List.Item>
      <List.Item>2º nível de piadas: 10 moedas de ouro</List.Item>
      <List.Item>3º nível de one-liners: 20 moedas de ouro</List.Item>
    </List>
  ),
};

export const TableStory: Story = {
  name: "Table",
  render: () => (
    <div className="max-w-md">
      <Table>
        <thead>
          <tr>
            <Table.Head>Tesouro do Rei</Table.Head>
            <Table.Head>Felicidade do Povo</Table.Head>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Table.Cell>Vazio</Table.Cell>
            <Table.Cell>Transbordando</Table.Cell>
          </tr>
          <tr>
            <Table.Cell>Modesto</Table.Cell>
            <Table.Cell>Satisfeito</Table.Cell>
          </tr>
        </tbody>
      </Table>
    </div>
  ),
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeInTheDocument();
    await expect(getComputedStyle(table).tableLayout).toBe("fixed");
    const header = canvas.getByRole("columnheader", {
      name: "Tesouro do Rei",
    });
    await expect(getComputedStyle(header).fontWeight).toBe("600");
    await expect(getComputedStyle(header).fontSize).toBe("12px");
    await expect(getComputedStyle(header).paddingTop).toBe("8px");
    await expect(getComputedStyle(header).paddingLeft).toBe("10px");
    await expect(getComputedStyle(header).lineHeight).toBe("12px");
  },
};
