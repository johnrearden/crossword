from django.shortcuts import render
from .models import DictionaryWord
from django.views import View


class GetMatchingWord(View):
    def get(self, request):
        if 'q' in request.GET:
            string = request.GET['q']
            known_chars = []
            for i, char in enumerate(string):
                if char != '_':
                    known_chars.append((i, char))
            print(known_chars)

            length = len(string)
            result_list = []
            full_list = DictionaryWord.objects.filter(length=length)
            for candidate in full_list:
                match = True
                for tup in known_chars:
                    index = tup[0]
                    char = tup[1]
                    if candidate.string[index] != char:
                        match = False
                        break
                if match:
                    result_list.append(candidate.string)

            context = {
                'results': result_list,
            }
        else:
            context = {}
        return render(request, 'builder/temp.html', context)
