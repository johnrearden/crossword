from builder.models import DictionaryWord, DictionaryDefinition
from django.db.models import Count
import enum


def fill():
    """ Pull the source files for the database in to memory, and
        save the data to the database. Each word will appear only once, but
        there may be more than one definition """
    raw_dictionary = []
    frequency_dict = {}

    # Bring the dictionary into memory, removing newline characters
    with open('data_ore/large_dictionary_2.txt') as dictionary_file:
        for line in dictionary_file:
            line = line.replace('\n', '')
            raw_dictionary.append(line)

    # Bring the frequency data into memory, removing newlines
    with open('data_ore/enwiki-20210820-words-frequency.txt') as freq_file:
        for line in freq_file:
            line = line.replace('\n', '')
            array = line.split(' ')
            word = array[0]
            freq = int(array[1])
            frequency_dict[word] = freq

    # Keep track of multiple instances of the same word.
    previous_word = ''

    for i, line in enumerate(raw_dictionary):
        array = line.split(',')
        current_word = array[0].lower()

        # If this is a repeated word, save only this instance's definition.
        if current_word == previous_word:
            defn = ''.join(array[2:])
            dictionary_word = DictionaryWord.objects.filter(
                string=current_word)[0]
            DictionaryDefinition.objects.create(
                word=dictionary_word,
                definition=defn,
            )
        else:
            # This is a new word, so save it, and the definition associated
            # with this first instance too.
            frequency = frequency_dict.get(current_word, 0)
            new_word = DictionaryWord.objects.create(
                string=current_word,
                length=len(current_word),
                frequency=frequency
            )
            defn = ''.join(array[2:])
            DictionaryDefinition.objects.create(
                word=new_word,
                definition=defn,
            )

        previous_word = current_word
        print(f'Saving {i} of {len(raw_dictionary)}\r')


def dedup_words():
    """ Remove duplicate words from the database """
    for dups in DictionaryWord.objects.values('string').annotate(records=Count('string')).filter(records__gt=1):
        for word in DictionaryWord.objects.filter(string=dups['string'])[1:]:
            word.delete()


class AnsiCommands(str, enum.Enum):
    """
    Holds the cursor movement and output deletion commands
    """
    SAVE_CURSOR = "\x1b7"
    RESTORE_CURSOR = "\x1b8"
    CARRIAGE_RETURN = "\r"
    TERMINAL_BELL = "\a"
    CLEAR_SCREEN = "\x1b[2J"
    CLEAR_LINE = "\x1b[2K"
    CLEAR_BUFFER = "\x1b[3J"
    CURSOR_TO_HOME = "\x1b[H"
    CURSOR_UP_ONE_LINE = "\x1b[1A"
    INVERSE_COLOR = "\x1b[7m"
    BLINK = "\x1b[5m"
    NORMAL = "\x1b[0m"
    FAINT = "\x1b[2m"
    BOLD = "\x1b[1m"
    DEFAULT_COLOR = "\x1b[00m"


if __name__ == '__main__':
    fill()
