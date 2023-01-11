from builder.models import DictionaryWord, DictionaryDefinition
from django.db.models import Count


def fill():
    raw_dictionary = []
    frequency_dict = {}
    with open('data_ore/large_dictionary_2.txt') as dictionary_file:
        for line in dictionary_file:
            line = line.replace('\n', '')
            raw_dictionary.append(line)
    with open('data_ore/enwiki-20210820-words-frequency.txt') as frequency_file:
        for line in frequency_file:
            line = line.replace('\n', '')
            array = line.split(' ')
            word = array[0]
            freq = int(array[1])
            frequency_dict[word] = freq

    for i, line in enumerate(raw_dictionary):
        array = line.split(',')
        word = array[0].lower()
        definition = ''.join(array[2:])
        frequency = frequency_dict.get(word, 0)
        dictionary_word = DictionaryWord(string=word, length=len(word),
                                         frequency=frequency)
        dictionary_word.save()
        dictionary_definition = DictionaryDefinition(word=dictionary_word,
                                                     definition=definition)
        dictionary_definition.save()
        print(f'Saving {i} of {len(raw_dictionary)}\r')


def dedup_words():
    for dups in DictionaryWord.objects.values('string').annotate(records=Count('string')).filter(records__gt=1):
        for word in DictionaryWord.objects.filter(string=dups['string'])[1:]:
            word.delete()


if __name__ == '__main__':
    fill()
