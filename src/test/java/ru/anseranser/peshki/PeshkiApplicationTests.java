package ru.anseranser.peshki;

import org.junit.jupiter.api.Test;


class PeshkiApplicationTests {


	@Test
	void contextLoads() {
		for (int i = 0; i < 27; i++) {
			System.out.print(getRelativePosition(i, 21) + " ");
		}
	}

	public int getRelativePosition(int absolutePosition, int offset) {
		return (absolutePosition - offset + 28) % 28;
	}

}
